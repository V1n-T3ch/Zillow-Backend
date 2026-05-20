const crypto = require('crypto');
const { admin, getFirestoreDb } = require('../config/firebaseAdmin');
const { verifyTransaction } = require('../services/paystackService');

const PAYSTACK_PLAN_CODE = process.env.PAYSTACK_PLAN_CODE || 'PLN_knou2hxlgq4dehy';
const SUBSCRIPTION_MONTHS = Number(process.env.PAYSTACK_SUBSCRIPTION_MONTHS || 1);

function addMonths(date, months) {
    const nextDate = new Date(date);
    nextDate.setMonth(nextDate.getMonth() + months);
    return nextDate;
}

function getNextExpiry(existingExpiry) {
    if (existingExpiry && typeof existingExpiry.toDate === 'function') {
        const currentExpiryDate = existingExpiry.toDate();
        if (currentExpiryDate.getTime() > Date.now()) {
            return addMonths(currentExpiryDate, SUBSCRIPTION_MONTHS);
        }
    }

    return addMonths(new Date(), SUBSCRIPTION_MONTHS);
}

async function findUserRefBySubscriptionIdentity(db, { userId, email }) {
    if (email) {
        const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
        if (!snapshot.empty) {
            return snapshot.docs[0].ref;
        }
    }

    if (userId) {
        return db.doc(`users/${userId}`);
    }

    return null;
}

async function updateUserSubscription({ userId, email, status, reference, subscriptionCode, planCode, amount, currency }) {
    const db = getFirestoreDb();
    const userRef = await findUserRefBySubscriptionIdentity(db, { userId, email });

    if (!userRef) {
        throw new Error('Unable to locate user for subscription update');
    }

    const snapshot = await userRef.get();
    if (!snapshot.exists) {
        throw new Error('User document does not exist');
    }

    const userData = snapshot.data();
    const currentSubscription = userData.subscription || {};
    const nextExpiry = status === 'active'
        ? getNextExpiry(currentSubscription.expiresAt)
        : currentSubscription.expiresAt || null;

    await userRef.set({
        subscription: {
            status,
            provider: 'paystack',
            planCode: planCode || PAYSTACK_PLAN_CODE,
            reference: reference || currentSubscription.reference || null,
            subscriptionCode: subscriptionCode || currentSubscription.subscriptionCode || null,
            amount: amount ?? currentSubscription.amount ?? null,
            currency: currency || currentSubscription.currency || 'KES',
            expiresAt: nextExpiry ? admin.firestore.Timestamp.fromDate(nextExpiry) : null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            activatedAt: status === 'active' ? admin.firestore.FieldValue.serverTimestamp() : currentSubscription.activatedAt || null
        }
    }, { merge: true });
}

exports.verifySubscription = async (req, res) => {
    try {
        const { reference } = req.body || {};
        const secretKey = process.env.PAYSTACK_SECRET_KEY;

        if (!reference) {
            return res.status(400).json({
                success: false,
                message: 'Payment reference is required'
            });
        }

        const verification = await verifyTransaction(reference, secretKey);

        if (verification.statusCode !== 200 || !verification.body?.status || verification.body?.data?.status !== 'success') {
            return res.status(400).json({
                success: false,
                message: verification.body?.message || 'Paystack verification failed',
                payload: verification.body
            });
        }

        const metadata = verification.body.data.metadata || {};
        const amount = verification.body.data.amount ? verification.body.data.amount / 100 : null;

        await updateUserSubscription({
            userId: metadata.userId,
            email: verification.body.data.customer?.email || metadata.email,
            status: 'active',
            reference,
            subscriptionCode: verification.body.data.subscription_code || metadata.subscriptionCode,
            planCode: verification.body.data.plan?.plan_code || metadata.planCode || PAYSTACK_PLAN_CODE,
            amount,
            currency: verification.body.data.currency || 'KES'
        });

        return res.status(200).json({
            success: true,
            message: 'Subscription verified successfully'
        });
    } catch (error) {
        console.error('Paystack verification error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to verify Paystack subscription'
        });
    }
};

exports.webhook = async (req, res) => {
    try {
        const secretKey = process.env.PAYSTACK_SECRET_KEY;
        const signature = req.headers['x-paystack-signature'];
        const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body || {});

        if (!secretKey) {
            return res.status(500).send('PAYSTACK_SECRET_KEY is not configured');
        }

        const expectedSignature = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');

        if (signature !== expectedSignature) {
            return res.status(401).send('Invalid signature');
        }

        const event = req.body || {};
        const eventType = event.event;
        const data = event.data || {};
        const metadata = data.metadata || {};

        if (eventType === 'charge.success' || eventType === 'subscription.create') {
            await updateUserSubscription({
                email: data.customer?.email || metadata.email,
                status: 'active',
                reference: data.reference,
                subscriptionCode: data.subscription_code || metadata.subscriptionCode,
                planCode: data.plan?.plan_code || metadata.planCode || PAYSTACK_PLAN_CODE,
                amount: data.amount ? data.amount / 100 : null,
                currency: data.currency || 'KES'
            });
        }

        if (eventType === 'subscription.disable' || eventType === 'invoice.payment_failed') {
            await updateUserSubscription({
                email: data.customer?.email || metadata.email,
                status: 'inactive',
                reference: data.reference,
                subscriptionCode: data.subscription_code || metadata.subscriptionCode,
                planCode: data.plan?.plan_code || metadata.planCode || PAYSTACK_PLAN_CODE,
                amount: data.amount ? data.amount / 100 : null,
                currency: data.currency || 'KES'
            });
        }

        return res.status(200).send('ok');
    } catch (error) {
        console.error('Paystack webhook error:', error);
        return res.status(500).send('Webhook handling failed');
    }
};
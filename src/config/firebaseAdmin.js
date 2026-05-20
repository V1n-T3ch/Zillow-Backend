const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let firestoreDb = null;

function initializeFirebaseAdmin() {
    if (admin.apps.length) {
        return admin.app();
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        let serviceAccount;
        const input = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
        
        // Check if it's a file path (doesn't start with '{')
        if (!input.startsWith('{')) {
            // It's a file path - resolve relative to project root
            const filePath = path.resolve(input);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            serviceAccount = JSON.parse(fileContent);
        } else {
            // It's JSON content
            serviceAccount = JSON.parse(input);
        }
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
        });
    } else {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: process.env.FIREBASE_PROJECT_ID
        });
    }

    return admin.app();
}

function getFirestoreDb() {
    if (!firestoreDb) {
        initializeFirebaseAdmin();
        firestoreDb = admin.firestore();
    }

    return firestoreDb;
}

module.exports = {
    admin,
    initializeFirebaseAdmin,
    getFirestoreDb
};
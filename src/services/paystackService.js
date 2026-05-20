const https = require('https');
const { URL } = require('url');

function requestJson(urlString, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlString);

        const request = https.request(
            {
                hostname: url.hostname,
                path: `${url.pathname}${url.search}`,
                method: options.method || 'GET',
                headers: options.headers || {}
            },
            (response) => {
                let responseBody = '';

                response.on('data', (chunk) => {
                    responseBody += chunk;
                });

                response.on('end', () => {
                    try {
                        const parsed = responseBody ? JSON.parse(responseBody) : {};
                        resolve({
                            statusCode: response.statusCode,
                            body: parsed
                        });
                    } catch (error) {
                        reject(new Error('Failed to parse Paystack response'));
                    }
                });
            }
        );

        request.on('error', reject);

        if (options.body) {
            request.write(options.body);
        }

        request.end();
    });
}

async function verifyTransaction(reference, secretKey) {
    if (!reference) {
        throw new Error('Transaction reference is required');
    }

    if (!secretKey) {
        throw new Error('PAYSTACK_SECRET_KEY is not configured');
    }

    return requestJson(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${secretKey}`
        }
    });
}

module.exports = {
    verifyTransaction
};
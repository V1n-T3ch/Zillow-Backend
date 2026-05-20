const express = require('express');
const router = express.Router();
const paystackController = require('../controllers/paystackController');

router.post('/verify-subscription', paystackController.verifySubscription);
router.post('/webhook', express.json(), paystackController.webhook);

module.exports = router;
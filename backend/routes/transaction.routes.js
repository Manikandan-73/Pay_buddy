/**
 * Transaction Route Definitions
 */

const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/transaction.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', TransactionController.getMyTransactions);
router.get('/:id', TransactionController.getTransactionById);

module.exports = router;

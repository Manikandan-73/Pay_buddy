/**
 * Transfer Route Definitions
 */

const express = require('express');
const router = express.Router();
const TransferController = require('../controllers/transfer.controller');
const { authenticate } = require('../middleware/auth.middleware');
const idempotency = require('../middleware/idempotency.middleware');
const { validateBody } = require('../middleware/requestValidator');

const transferRules = {
  receiverWalletId: { required: true, type: 'string' },
  amount: { required: true }
};

router.post(
  '/',
  authenticate,
  validateBody(transferRules),
  idempotency('TRANSFER'),
  TransferController.executeTransfer
);

module.exports = router;

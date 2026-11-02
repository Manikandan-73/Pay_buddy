/**
 * Mock Wallet Funding Gateway Service
 * Simulates depositing funds from external banking rails into PayBuddy wallet
 */

const crypto = require('crypto');
const { withTransaction } = require('../config/database');
const WalletRepository = require('../repositories/wallet.repository');
const TransactionRepository = require('../repositories/transaction.repository');
const LedgerRepository = require('../repositories/ledger.repository');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

function toMinorUnits(rupeesStr) {
  const parts = String(rupeesStr).trim().split('.');
  const whole = parseInt(parts[0], 10) || 0;
  const fraction = (parts[1] || '00').padEnd(2, '0').slice(0, 2);
  return whole * 100 + parseInt(fraction, 10);
}

function toDecimalString(paise) {
  return (paise / 100).toFixed(4);
}

function generateFundingUTR() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TOPUP-${dateStr}-${randomPart}`;
}

const FundingService = {
  async fundWallet({ userId, amount, paymentMethod = 'SIMULATED_UPI', simulateFailure = false }) {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('Simulated funding is disabled in production environments.', 403, 'SIMULATED_FUNDING_FORBIDDEN');
    }

    const amountInPaise = toMinorUnits(amount);
    if (isNaN(amountInPaise) || amountInPaise <= 0) {
      throw new AppError('Deposit amount must be a positive number.', 400, 'INVALID_AMOUNT');
    }

    if (amountInPaise > 5000000) { // Max ₹50,000 per top-up
      throw new AppError('Simulated top-up exceeds maximum single deposit limit of ₹50,000.', 400, 'DEPOSIT_LIMIT_EXCEEDED');
    }

    // Trigger deliberate failure simulation if requested or test amount 9999
    if (simulateFailure || amountInPaise === 999900) {
      throw new AppError('Simulated Bank Gateway: Card/UPI authorization declined.', 402, 'SIMULATED_GATEWAY_DECLINED');
    }

    return await withTransaction(async (connection) => {
      // 1. Lock User's Primary Wallet
      const wallet = await WalletRepository.findPrimaryByUserId(userId, connection);
      if (!wallet) {
        throw new AppError('Primary wallet not found for user.', 404, 'WALLET_NOT_FOUND');
      }

      const lockedWallet = await WalletRepository.findByIdWithLock(wallet.id, connection);

      // 2. Compute New Balance
      const currentBalancePaise = toMinorUnits(lockedWallet.balance);
      const newBalancePaise = currentBalancePaise + amountInPaise;
      const newBalanceDecimal = toDecimalString(newBalancePaise);
      const amountDecimal = toDecimalString(amountInPaise);

      // 3. Update Wallet Balance
      await WalletRepository.updateBalance(lockedWallet.id, newBalanceDecimal, connection);

      // 4. Record Funding Transaction
      const txId = `pb_tx_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      const reference = generateFundingUTR();

      await TransactionRepository.create({
        id: txId,
        reference,
        senderWalletId: null, // External clearing account
        receiverWalletId: lockedWallet.id,
        amount: amountDecimal,
        currency: 'INR',
        transactionType: 'WALLET_FUNDING',
        status: 'SUCCESS',
        completedAt: new Date()
      }, connection);

      // 5. Create Double-Entry Ledger Record (CREDIT to Wallet)
      const ledgerId = `pb_led_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      await LedgerRepository.createEntry({
        id: ledgerId,
        transactionId: txId,
        walletId: lockedWallet.id,
        entryType: 'CREDIT',
        amount: amountDecimal,
        currency: 'INR',
        description: `Simulated Top-Up via ${paymentMethod}`
      }, connection);

      logger.info(`Simulated Wallet Funding Successful: ${reference} | Amount: ₹${amountDecimal}`);

      return {
        transaction: {
          id: txId,
          reference,
          amount: amountDecimal,
          currency: 'INR',
          status: 'SUCCESS',
          paymentMethod,
          completedAt: new Date().toISOString()
        },
        wallet: {
          id: lockedWallet.id,
          newBalance: newBalanceDecimal
        }
      };
    });
  }
};

module.exports = FundingService;

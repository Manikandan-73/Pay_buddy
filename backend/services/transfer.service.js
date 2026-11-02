/**
 * Peer-to-Peer Transfer Engine
 * Production-grade financial transaction processing with deterministic locking and deadlock retry
 */

const { v4: uuidv4 } = require('crypto');
const { withTransaction } = require('../config/database');
const WalletRepository = require('../repositories/wallet.repository');
const TransactionRepository = require('../repositories/transaction.repository');
const LedgerRepository = require('../repositories/ledger.repository');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Convert string rupees to integer paise
function toMinorUnits(rupeesStr) {
  const parts = String(rupeesStr).trim().split('.');
  const whole = parseInt(parts[0], 10) || 0;
  const fraction = (parts[1] || '00').padEnd(2, '0').slice(0, 2);
  return whole * 100 + parseInt(fraction, 10);
}

// Convert paise integer back to MySQL DECIMAL string
function toDecimalString(paise) {
  return (paise / 100).toFixed(4);
}

function generateUTR() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `UTR-${dateStr}-${randomPart}`;
}

const TransferService = {
  async executeTransfer({ senderUserId, receiverWalletId, amount, currency = 'INR' }) {
    // 1. Validate Amount
    const amountInPaise = toMinorUnits(amount);
    if (isNaN(amountInPaise) || amountInPaise <= 0) {
      throw new AppError('Transfer amount must be a positive value greater than ₹0.00.', 400, 'INVALID_AMOUNT');
    }

    if (amountInPaise > 10000000) { // Max ₹1,00,000 per transaction
      throw new AppError('Transfer exceeds maximum single transaction limit of ₹1,00,000.', 400, 'LIMIT_EXCEEDED');
    }

    // 2. Fetch Sender's Primary Wallet
    const senderWallet = await WalletRepository.findPrimaryByUserId(senderUserId);
    if (!senderWallet) {
      throw new AppError('Sender wallet not found.', 404, 'SENDER_WALLET_NOT_FOUND');
    }

    // 3. Prevent Self Transfer
    if (senderWallet.id === receiverWalletId) {
      throw new AppError('Transfers to the same wallet are not allowed.', 400, 'SAME_WALLET_TRANSFER');
    }

    // 4. Pre-check sender balance before transaction to fail fast
    const currentSenderBalancePaise = toMinorUnits(senderWallet.balance);
    if (currentSenderBalancePaise < amountInPaise) {
      throw new AppError(
        `Insufficient balance. Available: ₹${senderWallet.balance}, Required: ₹${toDecimalString(amountInPaise)}`,
        422,
        'INSUFFICIENT_FUNDS'
      );
    }

    // 5. Execute with Bounded Deadlock Retry Loop
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      try {
        return await withTransaction(async (connection) => {
          // STEP 5A: Acquire Exclusive Row Locks in Deterministic Order
          const { senderWallet: lockedSender, receiverWallet: lockedReceiver } = 
            await WalletRepository.findTwoWithDeterministicLock(senderWallet.id, receiverWalletId, connection);

          if (!lockedReceiver) {
            throw new AppError('Receiver wallet does not exist.', 404, 'RECEIVER_NOT_FOUND');
          }

          if (lockedSender.status !== 'ACTIVE') {
            throw new AppError('Sender wallet is suspended.', 403, 'SENDER_WALLET_INACTIVE');
          }

          if (lockedReceiver.status !== 'ACTIVE') {
            throw new AppError('Recipient wallet is inactive or blocked.', 403, 'RECEIVER_WALLET_INACTIVE');
          }

          // STEP 5B: Re-verify Balance Under Lock
          const lockedSenderBalancePaise = toMinorUnits(lockedSender.balance);
          if (lockedSenderBalancePaise < amountInPaise) {
            throw new AppError('Insufficient balance during execution.', 422, 'INSUFFICIENT_FUNDS');
          }

          // STEP 5C: Calculate New Balances in Minor Units (Exact Math)
          const newSenderBalancePaise = lockedSenderBalancePaise - amountInPaise;
          const newReceiverBalancePaise = toMinorUnits(lockedReceiver.balance) + amountInPaise;

          const newSenderDecimal = toDecimalString(newSenderBalancePaise);
          const newReceiverDecimal = toDecimalString(newReceiverBalancePaise);

          // STEP 5D: Mutate Balances
          await WalletRepository.updateBalance(lockedSender.id, newSenderDecimal, connection);
          await WalletRepository.updateBalance(lockedReceiver.id, newReceiverDecimal, connection);

          // STEP 5E: Record Completed Transaction
          const txId = `pb_tx_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
          const reference = generateUTR();
          const amountDecimal = toDecimalString(amountInPaise);

          await TransactionRepository.create({
            id: txId,
            reference,
            senderWalletId: lockedSender.id,
            receiverWalletId: lockedReceiver.id,
            amount: amountDecimal,
            currency: 'INR',
            transactionType: 'P2P_TRANSFER',
            status: 'SUCCESS',
            completedAt: new Date()
          }, connection);

          // STEP 5F: Write Balanced Double-Entry Ledger Records
          const debitLedgerId = `pb_led_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
          await LedgerRepository.createEntry({
            id: debitLedgerId,
            transactionId: txId,
            walletId: lockedSender.id,
            entryType: 'DEBIT',
            amount: amountDecimal,
            currency: 'INR',
            description: `P2P Transfer to ${lockedReceiver.id}`
          }, connection);

          const creditLedgerId = `pb_led_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
          await LedgerRepository.createEntry({
            id: creditLedgerId,
            transactionId: txId,
            walletId: lockedReceiver.id,
            entryType: 'CREDIT',
            amount: amountDecimal,
            currency: 'INR',
            description: `P2P Transfer from ${lockedSender.id}`
          }, connection);

          logger.info(`P2P Transfer committed: ${reference} | Amount: ₹${amountDecimal}`);

          return {
            transaction: {
              id: txId,
              reference,
              amount: amountDecimal,
              currency: 'INR',
              status: 'SUCCESS',
              senderWalletId: lockedSender.id,
              receiverWalletId: lockedReceiver.id,
              completedAt: new Date().toISOString()
            },
            sender: {
              newBalance: newSenderDecimal
            }
          };
        });
      } catch (err) {
        // Handle MySQL Error 1213: Deadlock found when trying to get lock
        if (err.errno === 1213 || err.code === 'ER_LOCK_DEADLOCK') {
          logger.warn(`Deadlock detected on transfer attempt ${attempt}. Retrying with jitter...`);
          if (attempt >= maxRetries) {
            throw new AppError('Transaction could not be completed due to high concurrency. Please try again.', 503, 'CONCURRENCY_TIMEOUT');
          }
          // Exponential backoff with random jitter (20ms to 80ms)
          const delay = Math.pow(2, attempt) * 15 + Math.floor(Math.random() * 20);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
  }
};

module.exports = TransferService;

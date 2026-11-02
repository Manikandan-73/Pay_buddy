/**
 * Transaction History & Digital Receipt Service
 */

const TransactionRepository = require('../repositories/transaction.repository');
const WalletRepository = require('../repositories/wallet.repository');
const LedgerRepository = require('../repositories/ledger.repository');
const { AppError } = require('../middleware/errorHandler');

const TransactionService = {
  async getUserTransactions(userId, { limit = 20, offset = 0, status, type }) {
    const primaryWallet = await WalletRepository.findPrimaryByUserId(userId);
    if (!primaryWallet) {
      return [];
    }

    const txs = await TransactionRepository.listUserTransactions(primaryWallet.id, {
      limit: Math.min(parseInt(limit, 10) || 20, 100),
      offset: parseInt(offset, 10) || 0,
      status,
      type
    });

    return txs.map(tx => ({
      id: tx.id,
      reference: tx.reference,
      amount: tx.amount,
      currency: tx.currency,
      type: tx.transaction_type,
      status: tx.status,
      direction: tx.direction,
      counterparty: tx.direction === 'CREDIT' 
        ? (tx.sender_name || 'Simulated Bank Top-Up') 
        : (tx.receiver_name || 'Recipient'),
      createdAt: tx.created_at,
      completedAt: tx.completed_at
    }));
  },

  async getTransactionDetails(userId, transactionId) {
    const primaryWallet = await WalletRepository.findPrimaryByUserId(userId);
    if (!primaryWallet) {
      throw new AppError('Wallet not found.', 404, 'WALLET_NOT_FOUND');
    }

    const tx = await TransactionRepository.findById(transactionId);
    if (!tx) {
      throw new AppError('Transaction not found.', 404, 'TRANSACTION_NOT_FOUND');
    }

    // Verify ownership: user must be either sender or receiver
    if (tx.sender_wallet_id !== primaryWallet.id && tx.receiver_wallet_id !== primaryWallet.id) {
      throw new AppError('You are not authorized to view this transaction.', 403, 'FORBIDDEN');
    }

    const ledgerEntries = await LedgerRepository.getEntriesByTransactionId(tx.id);

    const isCredit = tx.receiver_wallet_id === primaryWallet.id;

    return {
      id: tx.id,
      reference: tx.reference,
      amount: tx.amount,
      currency: tx.currency,
      type: tx.transaction_type,
      status: tx.status,
      direction: isCredit ? 'CREDIT' : 'DEBIT',
      failureReason: tx.failure_reason,
      createdAt: tx.created_at,
      completedAt: tx.completed_at,
      sender: {
        walletId: tx.sender_wallet_id,
        name: tx.sender_name || 'Simulated Funding Gateway',
        phone: tx.sender_phone || 'N/A'
      },
      receiver: {
        walletId: tx.receiver_wallet_id,
        name: tx.receiver_name,
        phone: tx.receiver_phone
      },
      ledgerAudit: ledgerEntries.map(e => ({
        id: e.id,
        walletId: e.wallet_id,
        entryType: e.entry_type,
        amount: e.amount,
        createdAt: e.created_at
      }))
    };
  }
};

module.exports = TransactionService;

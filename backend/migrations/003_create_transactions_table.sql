-- Migration 003: Create Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(36) PRIMARY KEY,
  reference VARCHAR(64) NOT NULL UNIQUE,
  sender_wallet_id VARCHAR(36) NULL,
  receiver_wallet_id VARCHAR(36) NOT NULL,
  amount DECIMAL(15,4) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  transaction_type VARCHAR(32) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  failure_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  CONSTRAINT fk_tx_sender_wallet FOREIGN KEY (sender_wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT,
  CONSTRAINT fk_tx_receiver_wallet FOREIGN KEY (receiver_wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT,
  INDEX idx_tx_sender (sender_wallet_id),
  INDEX idx_tx_receiver (receiver_wallet_id),
  INDEX idx_tx_reference (reference),
  INDEX idx_tx_status (status),
  INDEX idx_tx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

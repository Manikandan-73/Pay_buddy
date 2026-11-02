-- Migration 004: Create Double-Entry Ledger Entries Table
CREATE TABLE IF NOT EXISTS ledger_entries (
  id VARCHAR(36) PRIMARY KEY,
  transaction_id VARCHAR(36) NOT NULL,
  wallet_id VARCHAR(36) NOT NULL,
  entry_type ENUM('DEBIT', 'CREDIT') NOT NULL,
  amount DECIMAL(15,4) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  description VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ledger_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
  INDEX idx_ledger_wallet (wallet_id),
  INDEX idx_ledger_tx (transaction_id),
  INDEX idx_ledger_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration 002: Create Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  wallet_type VARCHAR(20) NOT NULL DEFAULT 'MAIN',
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  balance DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT uq_user_wallet_type UNIQUE (user_id, wallet_type, currency),
  CONSTRAINT chk_wallet_balance_non_negative CHECK (balance >= 0.0000),
  INDEX idx_wallets_user (user_id),
  INDEX idx_wallets_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

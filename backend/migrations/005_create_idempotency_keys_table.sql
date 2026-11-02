-- Migration 005: Create Idempotency Keys Table
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  operation VARCHAR(50) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  request_hash VARCHAR(64) NOT NULL,
  processing_status ENUM('IN_PROGRESS', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'IN_PROGRESS',
  transaction_id VARCHAR(36) NULL,
  response_status INT NULL,
  response_body JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_idemp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_user_op_idemp UNIQUE (user_id, operation, idempotency_key),
  INDEX idx_idemp_lookup (user_id, idempotency_key),
  INDEX idx_idemp_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

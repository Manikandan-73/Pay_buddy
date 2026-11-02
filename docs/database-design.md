# PayBuddy Database Schema & Data Dictionary

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    users ||--o{ wallets : owns
    users ||--o{ idempotency_keys : authorizes
    wallets ||--o{ transactions : participates
    wallets ||--o{ ledger_entries : debited_or_credited
    transactions ||--|{ ledger_entries : records

    users {
        string id PK
        string full_name
        string email UK
        string phone UK
        string password_hash
        string status
        timestamp created_at
    }

    wallets {
        string id PK
        string user_id FK
        string wallet_type
        string currency
        decimal balance
        string status
        timestamp updated_at
    }

    transactions {
        string id PK
        string reference UK
        string sender_wallet_id FK
        string receiver_wallet_id FK
        decimal amount
        string currency
        string transaction_type
        string status
        timestamp completed_at
    }

    ledger_entries {
        string id PK
        string transaction_id FK
        string wallet_id FK
        string entry_type
        decimal amount
        string currency
        timestamp created_at
    }

    idempotency_keys {
        string id PK
        string user_id FK
        string operation
        string idempotency_key UK
        string request_hash
        string processing_status
        json response_body
        timestamp expires_at
    }
```

## 2. Integrity Invariants
1. `chk_wallet_balance_non_negative`: Enforces `balance >= 0.0000` at the database engine level.
2. `uq_user_wallet_type`: Restricts each user to at most one `MAIN` wallet per currency.
3. `fk_wallets_user` with `ON DELETE RESTRICT`: Prevents cascading deletions of accounts with historical financial records.

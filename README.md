# PayBuddy — Production-Inspired Digital Wallet & UPI Platform

PayBuddy is a production-inspired digital wallet and peer-to-peer payment platform built from the ground up to demonstrate rigorous backend engineering, financial consistency (double-entry ledger, idempotency, row-level locking), and clean vanilla frontend architecture.

## Tech Stack
- **Frontend:** Vanilla HTML5, CSS3, ES6+ JavaScript (Fetch API, CSS Flexbox/Grid, zero external framework dependencies)
- **Backend:** Node.js, Express.js (Layered Architecture: Routes -> Controllers -> Services -> Repositories)
- **Database:** MySQL 8 with InnoDB engine (ACID transactions, pessimistic locking, immutable ledger entries)
- **Security:** bcrypt, short-lived JWTs, database-backed idempotency (`x-idempotency-key`)
- **DevOps:** Docker, Docker Compose, Git

## Architectural Principles
1. **Double-Entry Bookkeeping:** Balances are fast snapshots; the ledger is the immutable, authoritative source of truth.
2. **Concurrency Safety:** Deterministic lock ordering (`SELECT ... FOR UPDATE` ordered by wallet ID) eliminates deadlocks during reciprocal transfers.
3. **Idempotency Guarantee:** SHA-256 payload verification prevents duplicate payments across network drops and retries.
4. **Exact Decimal Precision:** Financial computations avoid floating-point drift using exact minor units and MySQL `DECIMAL(15,4)`.

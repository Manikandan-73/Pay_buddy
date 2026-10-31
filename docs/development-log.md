# PayBuddy Engineering & Architecture Log

## Architecture Decision Records (ADR)

### ADR 001: Technology Stack Selection
- **Context:** We need a robust, production-inspired fintech platform demonstrating core software engineering principles for placement interviews without hiding behind heavyweight frameworks.
- **Decision:**
  - **Frontend:** Vanilla HTML5, CSS3, ES6+ JavaScript. No React/Vue/Tailwind. Direct DOM manipulation, Fetch API, CSS custom properties.
  - **Backend:** Node.js + Express.js. Layered clean architecture (`Routes -> Controllers -> Services -> Repositories -> MySQL`).
  - **Database:** MySQL 8 with InnoDB engine. Double-entry ledger with exact `DECIMAL(15,4)` math.
- **Consequences:** Eliminates framework magic; exposes fundamental engineering challenges: state synchronization, memory lifecycle, transaction locking, idempotency, and network error handling.

### ADR 002: Deterministic Pessimistic Locking for P2P Transfers
- **Problem:** Reciprocal transfers between User A and User B concurrently can produce cyclic wait-for graphs, leading to database deadlocks (MySQL Error 1213: `Deadlock found when trying to get lock; try restarting transaction`).
- **Decision:** Sort wallet IDs before invoking `SELECT ... FOR UPDATE` so locks are always acquired in identical global order across all threads.

### ADR 003: Double-Entry Bookkeeping System
- **Problem:** Updating balances directly without an audit trail makes reconciliation, fraud detection, and disaster recovery impossible.
- **Decision:** The wallet `balance` column acts purely as a fast-read snapshot. Authoritative balances are calculated from immutable `ledger_entries` where total debits equal total credits.

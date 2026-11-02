# PayBuddy REST API Documentation

Base URL: `http://localhost:5000/api/v1`

---

## 1. Authentication Endpoints

### Register User & Wallet
`POST /auth/register`

**Payload:**
```json
{
  "fullName": "Alice Johnson",
  "email": "alice@paybuddy.local",
  "phone": "+919876543210",
  "password": "Password@123"
}
```

### User Login
`POST /auth/login`

**Payload:**
```json
{
  "email": "alice@paybuddy.local",
  "password": "Password@123"
}
```

---

## 2. Wallet & Transfer Endpoints

### Get Current User Profile & Primary Wallet
`GET /auth/me`
*Requires Header:* `Authorization: Bearer <TOKEN>`

### Resolve Recipient
`GET /wallets/lookup?query=+919876543211`
*Requires Header:* `Authorization: Bearer <TOKEN>`

### Peer-to-Peer Transfer
`POST /transfers`
*Requires Headers:*
- `Authorization: Bearer <TOKEN>`
- `x-idempotency-key: <UUID-v4>`

**Payload:**
```json
{
  "receiverWalletId": "pb_wal_bob_main_02",
  "amount": "250.00",
  "currency": "INR"
}
```

### Simulated Funding Top-Up
`POST /wallets/fund`
*Requires Headers:*
- `Authorization: Bearer <TOKEN>`
- `x-idempotency-key: <UUID-v4>`

**Payload:**
```json
{
  "amount": "1000.00",
  "paymentMethod": "SIMULATED_UPI",
  "simulateFailure": false
}
```

---

## 3. Transaction History & Receipts

### Get Transaction List
`GET /transactions?limit=20&offset=0`
*Requires Header:* `Authorization: Bearer <TOKEN>`

### Get Transaction Receipt & Ledger Audit
`GET /transactions/:id`
*Requires Header:* `Authorization: Bearer <TOKEN>`

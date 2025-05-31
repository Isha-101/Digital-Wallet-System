# Digital Wallet System

A backend project for managing wallets, transactions, and fraud detection using Node.js, Express, MongoDB.

## Setup

1. Clone this repo
2. Run `npm install`
3. Add your `.env` file
4. Start server with `npm run dev`
5. Access Swagger Docs at `/api-docs` at http://localhost:3000/api-docs

## Features

### Core Features
- ✅ User Authentication & Session Management (JWT)
- ✅ Wallet Operations (Deposit, Withdraw, Transfer)
- ✅ Transaction Processing & Validation
- ✅ Basic Fraud Detection Logic
- ✅ Admin & Reporting APIs
- ✅ RESTful API Design
- ✅ Swagger API Documentation

### Bonus Features
- ✅ Scheduled Jobs for Daily Fraud Scans
- ✅ Soft Delete for Accounts and Transactions
- ✅ Email Alerts for Suspicious Transactions (Mocked)
- ✅ Multi-currency Support
- ✅ Rate Limiting
- ✅ Security Headers

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet, bcrypt, Rate Limiting
- **Scheduling**: node-cron
- **Email**: Nodemailer (mocked)

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd digital-wallet-system
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start MongoDB**
```bash
# Make sure MongoDB is running on your system
mongod
```

5. **Run the application**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Documentation

Once the server is running, access the Swagger documentation at:
```
http://localhost:3000/api-docs
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Wallet Operations
- `GET /api/wallet/balance` - Get wallet balance
- `POST /api/wallet/deposit` - Deposit money
- `POST /api/wallet/withdraw` - Withdraw money
- `POST /api/wallet/transfer` - Transfer to another user

### Transactions
- `GET /api/transactions/history` - Get transaction history
- `GET /api/transactions/:id` - Get transaction details

### Admin (Requires admin privileges)
- `GET /api/admin/flagged-transactions` - View flagged transactions
- `GET /api/admin/total-balances` - Get aggregated balances
- `GET /api/admin/top-users` - Get top users by balance/transactions
- `GET /api/admin/dashboard` - Get dashboard statistics
- `PATCH /api/admin/users/:id/soft-delete` - Soft delete user

## Fraud Detection

The system implements rule-based fraud detection:

1. **High Frequency Detection**: Flags users with >5 transactions per hour
2. **Large Amount Detection**: Flags transactions >$10,000
3. **Suspicious Patterns**: Flags multiple large withdrawals
4. **Daily Scans**: Automated daily analysis of transaction patterns

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation with Joi
- Rate limiting (100 requests per 15 minutes)
- Security headers with Helmet
- Protected admin endpoints
- Soft delete functionality

## Database Schema

### Users
- username, email, password (hashed)
- isActive, isDeleted flags
- Timestamps

### Wallets
- userId reference
- Multi-currency balances array
- Soft delete support

### Transactions
- fromUserId, toUserId references
- type (deposit/withdrawal/transfer)
- amount, currency, description
- status, fraud flags
- Soft delete support




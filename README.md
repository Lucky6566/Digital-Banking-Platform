# Digital Banking Platform

A full-stack digital banking application built with **FastAPI, SQLAlchemy, SQLite, HTML, CSS, and JavaScript**. The platform provides a responsive banking dashboard with authentication, account information, transaction management, financial summaries, and live backend connectivity.

## 🚀 Project Overview

DigitalBank is a web-based banking platform designed to demonstrate core digital banking workflows in a modern full-stack application.

The project connects a JavaScript frontend to a FastAPI backend and uses SQLite for persistent data storage.

### Key Features

* 🔐 User authentication and JWT-based session handling
* 👤 User profile information
* 🏦 Bank account management
* 💰 Available balance display
* 📥 Deposit transactions
* 📤 Withdrawal transactions
* 🔄 Account-to-account transfers
* 📊 Transaction analytics and financial summaries
* 🔎 Transaction search and filtering
* 🧾 Recent transaction history
* 🔄 Dashboard refresh functionality
* 🟢 Backend connection monitoring
* ⏱️ Automatic dashboard data refresh
* 🚪 Secure logout functionality
* 📱 Responsive banking dashboard UI
* 🎨 Professional banking-focused interface
* 🔔 Banking notifications
* 🧪 Automated backend API tests
* 📚 Interactive FastAPI Swagger documentation

## 🛠️ Technology Stack

### Frontend

* HTML5
* CSS3
* JavaScript
* Responsive UI design
* Fetch API
* Browser Local Storage

### Backend

* Python 3.11
* FastAPI
* Uvicorn
* SQLAlchemy
* Pydantic
* JWT authentication

### Database

* SQLite

### Testing

* Pytest
* FastAPI TestClient

### Development Tools

* Visual Studio Code
* PowerShell
* Git
* GitHub

## 📁 Project Structure

```text
Digital-Banking-Platform/
│
├── backend/
│   ├── routers/
│   ├── auth.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   └── schemas.py
│
├── frontend/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   └── transactions.js
│   ├── dashboard.css
│   ├── dashboard.html
│   ├── favicon.svg
│   └── index.html
│
├── tests/
│   └── test_main.py
│
├── database/
│
├── docs/
│
├── digital_banking.db
├── requirements.txt
├── README.md
└── .gitignore
```

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/Lucky6566/Digital-Banking-Platform.git
cd Digital-Banking-Platform
```

### 2. Create a virtual environment

Windows PowerShell:

```powershell
python -m venv .venv
```

### 3. Activate the virtual environment

```powershell
.\.venv\Scripts\Activate.ps1
```

If PowerShell execution policy prevents activation, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
```

Then activate again:

```powershell
.\.venv\Scripts\Activate.ps1
```

### 4. Install dependencies

```powershell
python -m pip install -r requirements.txt
```

## ▶️ Running the Backend

From the project root:

```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8004 --reload
```

The backend will be available at:

```text
http://127.0.0.1:8004
```

## 📚 API Documentation

FastAPI automatically provides interactive API documentation.

Swagger UI:

```text
http://127.0.0.1:8004/docs
```

ReDoc:

```text
http://127.0.0.1:8004/redoc
```

The Swagger interface can be used to inspect and test the available API endpoints.

## 🌐 Running the Frontend

After starting the backend, open the frontend login page:

```text
frontend/index.html
```

The application uses the backend API at:

```text
http://127.0.0.1:8004
```

After successful authentication, the user is redirected to the banking dashboard.

## 🔑 Authentication Flow

The application uses token-based authentication.

General flow:

```text
User
  │
  ▼
Login Page
  │
  ▼
FastAPI Authentication API
  │
  ▼
Access Token
  │
  ▼
Browser Local Storage
  │
  ▼
Dashboard
  │
  ├── User Profile
  ├── Account Summary
  ├── Account Details
  └── Transactions
```

Protected API requests include the access token in the authorization header.

## 💳 Banking Operations

The dashboard supports the following core banking operations:

### Deposit

Adds funds to the user's account and updates the account balance.

### Withdrawal

Removes funds from the user's account after validation.

### Transfer

Transfers funds through the banking transaction API.

### Transaction History

Displays recent banking transactions and provides search/filter functionality.

### Account Summary

The dashboard displays financial information including:

* Available balance
* Total deposits
* Total withdrawals
* Total transfers
* Account number

## 📊 Dashboard

The DigitalBank dashboard provides:

* Account overview
* Profile information
* Quick banking actions
* Recent transactions
* Transaction analytics
* Search and filtering
* Refresh functionality
* Backend connection status

The frontend communicates with the FastAPI backend using asynchronous JavaScript requests.

## 🧪 Testing

Run the complete backend test suite from the project root:

```powershell
python -m pytest -q
```

The current test suite passes successfully:

```text
10 passed
```

There are currently a few dependency deprecation warnings related to the installed FastAPI/Starlette/Pydantic versions, but they do not cause test failures.

## 🔍 API Health Check

To verify that the backend is running:

```powershell
Invoke-WebRequest http://127.0.0.1:8004/docs -UseBasicParsing
```

A successful response should return:

```text
StatusCode : 200
StatusDescription : OK
```

## 🔒 Security Considerations

This project is intended as a learning and portfolio application.

The application demonstrates:

* Token-based authentication
* Protected API endpoints
* Authorization headers
* Session handling
* Input validation
* Backend/frontend separation

For production banking systems, additional security controls would be required, including secure secret management, HTTPS, stronger authentication, rate limiting, audit logging, encryption, fraud monitoring, and production-grade database infrastructure.

## 📌 Current Project Status

**Status: Functional**

The main banking workflow has been implemented and tested.

Current validation includes:

* Backend API running successfully
* Frontend dashboard loading successfully
* User profile loading
* Account information loading
* Account number displaying correctly
* Transaction history loading
* Quick Actions functioning
* Automatic refresh functioning
* Backend connection monitoring functioning
* Logout functionality working
* Automated tests passing
* Git working tree clean

## 🧭 Future Improvements

Potential future enhancements include:

* Admin dashboard
* Beneficiary management
* Scheduled payments
* Bill payments
* UPI integration
* Email/SMS notifications
* Two-factor authentication
* Advanced transaction analytics
* PDF bank statements
* Account statement downloads
* Role-based access control
* Production database migration
* Cloud deployment
* CI/CD pipeline

## 👨‍💻 Author

**Lucky6566**

GitHub:

https://github.com/Lucky6566

## 📄 License

This project is intended for educational, portfolio, and demonstration purposes.

# 💰 Expense Tracker — Lab Project

> A simple, full-stack Expense Tracker built with HTML, Bootstrap, jQuery (frontend) and Node.js / Express (backend).

---

## 📁 Project Structure

```
CRUD_JQuery/
├── frontend/
│   ├── index.html          ← Main single-page layout
│   ├── css/
│   │   └── style.css       ← Custom styles (Bootstrap override)
│   ├── js/
│   │   └── script.js       ← jQuery CRUD logic
│   └── assets/
│       ├── images/         ← App images / icons
│       └── fonts/          ← Local font files (if any)
│
├── backend/
│   ├── server.js           ← Express entry point
│   ├── routes/
│   │   └── transactions.js ← API routes for transactions
│   ├── controllers/
│   │   └── transactionController.js
│   ├── models/
│   │   └── transaction.js  ← Data model / schema
│   └── data/
│       └── db.json         ← JSON flat-file database (dev)
│
├── .gitignore
├── package.json
└── README.md               ← You are here
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- npm >= 9

### Install dependencies
```bash
npm install
```

### Run backend server
```bash
npm run server
```

### Open frontend
Open `frontend/index.html` directly in your browser, or serve via Live Server.

---

## 📌 Features

- [ ] Add income / expense transactions
- [ ] View all transactions in a table
- [ ] Delete a transaction
- [ ] Live summary cards (Total Income, Total Expense, Balance)
- [ ] REST API backend (Express)

---

## 🛠️ Tech Stack

| Layer    | Technology          |
|----------|---------------------|
| Frontend | HTML5, Bootstrap 5, jQuery 3 |
| Backend  | Node.js, Express    |
| Database | JSON flat-file (dev) |

---

## 👨‍💻 Author

Sujan Adhikari — 2026

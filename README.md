# Personal Finance Assistant

A full-stack application for tracking income and expenses with AI-powered receipt processing and analytics.

**By Jaya Harsh Vardhan Alagadapa (IIITS)**

## 🚀 Features

- **Income & Expense Tracking** - Log and categorize transactions
- **Receipt OCR Processing** - Upload receipts and automatically extract data
- **Analytics & Charts** - Visualize spending patterns
- **Advanced Filtering** - Search and filter transactions by date, category, type
- **PDF Import** - Import transaction history from PDF statements
- **Multi-user Support** - Secure authentication and user management

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Tesseract.js** for OCR processing
- **Multer** for file uploads

### Frontend
- **React** with Vite
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Chart.js** for analytics
- **Axios** for API calls

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- npm or yarn

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd typeface-finance-app
```

### 2. Backend Setup
```bash
cd backend
npm install
```

### 3. Environment Setup
Create a `.env` file in the backend directory:
```env
MONGODB_URI=mongodb://localhost:27017/finance-app
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d
PORT=5000
FRONTEND_URL=http://localhost:5173
```

### 4. Start Backend Server
```bash
npm run dev
```

### 5. Create Demo User (Optional)
```bash
npm run setup
```
This creates a demo user with:
- Email: `demo@finance.com`
- Password: `demo123`

### 6. Add Sample Data (Optional)
```bash
npm run setup-data
```
This creates sample transactions and receipts for testing.

### 7. Frontend Setup
```bash
cd ../frontend
npm install
```

### 8. Start Frontend Development Server
```bash
npm run dev
```

## 🎯 Demo Access

### Quick Demo Login
- **Email:** `demo@finance.com`
- **Password:** `demo123`
- Click the "🚀 Quick Demo Login" button on the login page

### Manual Registration
- Navigate to `/register`
- Create a new account with your details

## 📱 Usage

### 1. Landing Page
- Visit `http://localhost:5173`
- Explore features and sign up/login

### 2. Dashboard
- View financial summary
- Quick action cards for common tasks
- Recent transactions overview

### 3. Transactions
- Add new income/expense entries
- Filter and search transactions
- Edit or delete existing entries

### 4. Receipts
- Upload receipt images (JPEG, PNG)
- Upload PDF receipts
- Automatic data extraction via OCR

### 5. Analytics
- View spending patterns
- Category-wise breakdowns
- Monthly trends and insights

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

### Transactions
- `GET /api/transactions` - List transactions (with pagination)
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/analytics` - Get analytics

### Receipts
- `POST /api/receipts/upload` - Upload receipt
- `GET /api/receipts/:filename` - Get receipt details
- `DELETE /api/receipts/:filename` - Delete receipt

## 🎨 UI Features

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Typeface-inspired Design** - Clean, modern interface
- **Dark/Light Mode Ready** - Tailwind CSS framework
- **Accessibility** - Screen reader friendly
- **Loading States** - Smooth user experience

## 🧪 Testing

### For Evaluators
1. **Demo Login** - Use the green "Quick Demo Login" button
2. **Receipt Upload** - Test OCR with sample receipt images
3. **Transaction Management** - Add, edit, delete transactions
4. **Analytics** - View charts and spending patterns
5. **Responsive Design** - Test on different screen sizes

### Sample Data
- Add sample transactions to see analytics
- Upload receipt images to test OCR
- Use filters to test pagination and search

## 🐛 Troubleshooting

### Common Issues

1. **Demo Login Fails**
   - Ensure backend server is running
   - Run `npm run setup` in backend directory
   - Check MongoDB connection

2. **CSS Not Loading**
   - Ensure Tailwind CSS is properly configured
   - Check PostCSS configuration
   - Restart development server

3. **Receipt Upload Fails**
   - Check file size (max 5MB)
   - Ensure file format is JPEG, PNG, or PDF
   - Verify backend uploads directory exists

4. **API Errors**
   - Check backend server status
   - Verify MongoDB connection
   - Check environment variables

## 📁 Project Structure

```
typeface-finance-app/
├── backend/
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── models/          # MongoDB models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth middleware
│   │   └── utils/           # Helper functions
│   └── uploads/             # Receipt storage
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   └── utils/           # Helper functions
│   └── public/              # Static assets
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 👨‍💻 Author

**AJ Harsh Vardhan**
- Personal Finance Assistant
- TypefaceAI Assignment

---

**Built with ❤️ using React, Node.js, and MongoDB**

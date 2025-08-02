# 💰 Personal Finance Assistant

[![Live Demo](https://img.shields.io/badge/LIVE_DEMO-Try_it_Now_🚀-FF5757?style=for-the-badge&logo=react&logoColor=white)](https://finance-assistant.vercel.app)
[![Deployment Status](https://img.shields.io/github/deployments/ItsAJ1005/typeface-finance-app/production?style=for-the-badge&logo=vercel&label=vercel&logoColor=white)](https://vercel.com/ItsAJ1005/finance-assistant/deployments)
[![Backend Status](https://img.shields.io/badge/API-Online_✨-blue?style=for-the-badge&logo=railway&logoColor=white)](https://finance-assistant-production.up.railway.app)

> 🌟 Transform your financial management with insights and automated receipt processing

A production-ready, full-stack application that revolutionizes personal finance management through cutting-edge AI technology, automated receipt processing, and real-time analytics. Built with enterprise-grade security and scalability in mind.

**By Jaya Harsh Vardhan Alagadapa (IIITS)**
[![GitHub stars](https://img.shields.io/github/stars/ItsAJ1005/typeface-finance-app?style=social)](https://github.com/ItsAJ1005/typeface-finance-app/stargazers)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

## 🚀 Key Features

### 💡 Smart Financial Management
- **Intelligent Transaction Categorization** - AI-powered automatic categorization of transactions using advanced pattern recognition
- **Multi-Currency Support** - Handle transactions in multiple currencies with real-time conversion
- **Custom Categories & Tags** - Create personalized categories and tags for better organization
- **Budget Planning & Alerts** - Set monthly budgets and receive real-time notifications

### 🤖 AI-Powered Receipt Processing
- **Advanced OCR Technology** - Utilizes Tesseract.js for accurate text extraction from receipts
- **Smart Data Extraction** - Automatically identifies merchant names, amounts, dates, and items
- **PDF Statement Import** - Bulk import transactions from bank statements and credit card PDFs
- **Receipt Image Enhancement** - Automatic image preprocessing for better OCR accuracy

### 📊 Advanced Analytics
- **Interactive Dashboards** - Real-time visualization of financial data
- **Predictive Insights** - AI-driven spending predictions and trends analysis
- **Custom Reports** - Generate detailed financial reports with custom date ranges
- **Category Analytics** - Deep dive into spending patterns by category

### 🔒 Enterprise-Grade Security
- **JWT Authentication** - Secure token-based authentication system
- **Rate Limiting** - Protection against brute force attacks
- **Data Encryption** - Sensitive data encryption at rest and in transit
- **Input Validation** - Comprehensive request validation and sanitization

### 🎯 User Experience
- **Responsive Design** - Seamless experience across all devices
- **Dark/Light Mode** - Eye-friendly theme options
- **Offline Support** - Basic functionality works without internet
- **Real-time Updates** - Instant reflection of changes across devices

## 🛠️ Technology Stack

### 🎯 Frontend Architecture
- **Framework:** React 19.1 with Vite 7.0 for lightning-fast development
- **State Management:** React Context API for efficient state management
- **Routing:** React Router v7 for seamless navigation
- **Styling:** Tailwind CSS v3.4 for modern, responsive design
- **Charts:** Chart.js with react-chartjs-2 for interactive visualizations
- **HTTP Client:** Axios with request/response interceptors
- **Build Tool:** Vite for optimized production builds
- **Type Safety:** PropTypes for component props validation

### 🔧 Backend Infrastructure
- **Runtime:** Node.js with Express.js for robust API development
- **Database:** MongoDB with Mongoose ODM for flexible data modeling
- **Authentication:** JWT with refresh token rotation
- **File Processing:**
  - Tesseract.js v4.1 for advanced OCR capabilities
  - Sharp v0.34 for image optimization
  - Multer for efficient file uploads
  - PDF-parse for statement processing
- **Security:**
  - Helmet for enhanced API security
  - Express-rate-limit for DDoS protection
  - Express-validator for input validation
  - CORS with configurable origins

### 🎨 Developer Experience
- **Code Quality:**
  - ESLint v9 with custom ruleset
  - Prettier for consistent formatting
  - React-specific linting rules
- **Performance:**
  - Code splitting and lazy loading
  - Image optimization pipeline
  - Caching strategies
- **Development:**
  - Hot Module Replacement (HMR)
  - Development-ready configurations
  - Comprehensive error handling

## � Deployment & Scaling

### Cloud Infrastructure
- **Frontend:** Vercel for automatic deployments and global CDN
- **Backend:** Railway with auto-scaling capabilities
- **Database:** MongoDB Atlas with automated backups
- **File Storage:** AWS S3 for scalable receipt storage
- **Monitoring:** Integrated logging and performance monitoring

### Performance Optimizations
- **Frontend:**
  - Code splitting and lazy loading
  - Asset optimization and caching
  - CDN integration for static assets
  - Progressive Web App (PWA) ready
- **Backend:**
  - Connection pooling
  - Request rate limiting
  - Caching strategies
  - Optimized database queries

### Security Measures
- **Authentication:** JWT with refresh token rotation
- **Data Protection:** AES-256 encryption for sensitive data
- **API Security:** 
  - Rate limiting
  - CORS configuration
  - XSS protection
  - CSRF prevention
- **Input Validation:** Comprehensive request validation

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

## � Deployment & Scaling

### Cloud Infrastructure
- **Frontend:** Vercel for automatic deployments and global CDN
- **Backend:** Railway/Heroku with auto-scaling capabilities
- **Database:** MongoDB Atlas with automated backups
- **File Storage:** AWS S3 for scalable receipt storage
- **Monitoring:** Integrated logging and performance monitoring

### Performance Optimizations
- **Frontend:**
  - Code splitting and lazy loading
  - Asset optimization and caching
  - CDN integration for static assets
  - Progressive Web App (PWA) ready
- **Backend:**
  - Connection pooling
  - Request rate limiting
  - Caching strategies
  - Optimized database queries

### Security Measures
- **Authentication:** JWT with refresh token rotation
- **Data Protection:** AES-256 encryption for sensitive data
- **API Security:** 
  - Rate limiting
  - CORS configuration
  - XSS protection
  - CSRF prevention
- **Input Validation:** Comprehensive request validation

## �📄 License

MIT License - see LICENSE file for details

## 👨‍💻 Author

**AJ Harsh Vardhan**

---

<div align="center">

**Built with ❤️ using React, Node.js, and MongoDB**

If you found this project helpful, please consider giving it a ⭐

</div>

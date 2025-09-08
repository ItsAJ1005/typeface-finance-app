# 💰 Personal Finance Assistant

[![Live Link](https://img.shields.io/badge/LIVE_DEMO-🚀-FF5757?style=for-the-badge&logo=react&logoColor=white)](https://typeface-finance-app.vercel.app/)
[![Frontend Status](https://img.shields.io/github/deployments/ItsAJ1005/typeface-finance-app/production?style=for-the-badge&logo=vercel&label=vercel&logoColor=white)](https://typeface-finance-app.vercel.app)
[![Backend Status](https://img.shields.io/badge/API-Online_✨-blue?style=for-the-badge&logo=render&logoColor=white)](https://typeface-finance-app.onrender.com)


> 🌟 Transform your financial management with insights and automated receipt processing

A production-ready, full-stack application that revolutionizes personal finance management, automated receipt processing, and real-time analytics. Built with enterprise-grade security and scalability in mind.

**By Jaya Harsh Vardhan Alagadapa (IIITS)**
[![GitHub stars](https://img.shields.io/github/stars/ItsAJ1005/typeface-finance-app?style=social)](https://github.com/ItsAJ1005/typeface-finance-app/stargazers)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

### 🚀 **Live Site**

[![Live Site](https://img.shields.io/badge/🌐_VISIT_LIVE_SITE-FF4757?style=for-the-badge&logo=google-chrome&logoColor=white&labelColor=000000)](https://typeface-finance-app.vercel.app/)
### 📷 **Demo Video (click on below image for demo video)**
[![Watch the video](https://i.postimg.cc/FsWSRf6v/expense-tracker.jpg)](https://drive.google.com/file/d/1_jS_55DXUMscizPXFJKCFeEOq0cCZ0-X/view?usp=sharing)


## 🚀 Key Features

### 💡 Smart Financial Management
- **Intelligent Transaction Categorization** - Categorization of transactions using catefory mappings
- **Custom Categories & Tags** - Create personalized categories and tags for better organization
- **Automated Bill Payments** - Set up and manage recurring payments with autopay functionality

### 🤖 Receipt Processing
- **Advanced OCR Technology** - Utilizes Tesseract.js for accurate text extraction from receipts
- **Smart Data Extraction** - Automatically identifies merchant names, amounts, dates, and items
- **PDF Statement Import** - Bulk import transactions from bank statements and credit card PDFs
- **Receipt Image Enhancement** - Automatic image preprocessing for better OCR accuracy

### 📊 Advanced Analytics
- **Interactive Dashboards** - Real-time visualization of financial data
- **Custom Reports** - Generate detled financial reports with custom date ranges
- **Category Analytics** - Deep dive into spending patterns by category

### 🧠 AI Features (GenAI)
- **AI Chat Assistant**: Interactive chat interface powered by OpenAI that helps users understand their finances, answer questions about transactions, and provide personalized financial advice.
- **AI Financial Insights**: Analyzes the last 30 days of transactions and generates a structured report with Spending Patterns, High Expenditure Areas, Savings Opportunities, and Budget Recommendations. Output is rendered as Markdown in the UI with headings, lists, and bold text.
- **Personalized Financial Advice**: Produces tailored recommendations based on recent income/expense mix, savings rate, and category breakdown.
- **Receipt OCR + LLM Analysis**: OCR extracts amount, category, description, and date from uploaded receipts to prefill transactions; optional LLM analysis highlights merchant/category/tax flags.
- **Category Suggestion (capability)**: Smart category suggestion via LLM is available and can be integrated into the add-transaction flow.

> Implementation details: 
> - **AI Chat**: Powered by OpenAI's GPT models with context-aware responses based on user's financial data.
> - **Financial Analysis**: Uses Google Gemini (primary: `gemini-1.5-pro`, fallback: `gemini-1.5-flash`) with retry/backoff and model fallback for quota/rate-limits. 
> - **Currency Formatting**: Prompts enforce Indian Rupee (₹/INR) formatting; frontend renders AI output as Markdown via `react-markdown` + `remark-gfm`.

### 🔒 Enterprise-Grade Security
- **JWT Authentication** - Secure token-based authentication system
- **OAuth 2.0 Integration** - Secure third-party authentication via Google and other providers
- **Rate Limiting** - Protection against brute force attacks
- **Input Validation** - Comprehensive request validation and sanitization

### 🎯 User Experience
- **Responsive Design** - Seamless experience across all devices
- **Real-time Updates** - Instant reflection of changes across devices
- **Social Login** - Quick and easy sign-in with Google OAuth
- **AI Chat Assistant** - Interactive chat interface for personalized support

## 🛠️ Technology Stack

### 🎯 Frontend Architecture
- **Framework**: React with Vite for fast development and optimized builds
- **State Management**: React Context API for global state management
- **UI Components**: Material-UI (MUI) with custom theme
- **Form Handling**: React Hook Form with Yup validation
- **Routing**: React Router for client-side routing
- **Charts**: Chart.js with react-chartjs-2 for data visualization
- **Date Handling**: date-fns for date manipulation and formatting
- **AI Chat**: Floating chat interface with real-time message streaming and context-aware responses
- **Build Tool:** Vite for optimized production builds
- **Type Safety:** PropTypes for component props validation

### 🔧 Backend Infrastructure
- **Runtime**: Node.js with Express.js for robust API development
- **Database**: MongoDB with Mongoose ODM for flexible data modeling
- **Authentication**: JWT with refresh token rotation and OAuth 2.0 support
- **Scheduled Jobs**: Node-cron for managing recurring payments and autopay functionality
- **AI Integration**: OpenAI API integration for natural language processing and financial insights
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

### Security Measures
- **Authentication:** JWT with refresh token rotation
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

## 🔧 Environment Variables

### Backend
Add the following to your `.env` file in the `backend` directory:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Existing environment variables...
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
# ... other existing variables
```

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
- **Backend:** Render with auto-scaling capabilities
- **Database:** MongoDB Atlas with automated backups
- **Monitoring:** Integrated logging and performance monitoring

### Performance Optimizations
  - Request rate limiting
  - Optimized database queries

### Security Measures
- **Authentication:** JWT with refresh token rotation
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

**Built with ❤️ using React, Node.js, Express, Tesseract.js and MongoDB**

If you found this project helpful, please consider giving it a ⭐

</div>

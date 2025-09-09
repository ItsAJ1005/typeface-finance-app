import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiArrowRight, 
  FiDollarSign, 
  FiPieChart, 
  FiCamera, 
  FiCheck, 
  FiFilter, 
  FiUpload, 
  FiMessageSquare, 
  FiCreditCard, 
  FiDatabase 
} from 'react-icons/fi';

const LandingPage = () => {
  const [showBanner, setShowBanner] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Top Banner */}
      {showBanner && (
        <div className="bg-black text-white py-2 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded flex items-center justify-center">
              <span className="text-white text-xs">💰</span>
            </div>
            <span className="text-sm">Discover the latest features of Personal Finance Assistant</span>
            <Link to="/register" className="text-red-400 hover:text-red-300 text-sm font-medium">
              Learn more →
            </Link>
          </div>
          <button 
            onClick={() => setShowBanner(false)}
            className="text-white hover:text-gray-300"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <header className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent'} border-b border-gray-100`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
                <FiDollarSign className="text-white text-xl" />
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">FinanceTracker</span>
            </motion.div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/features" className="text-gray-600 hover:text-red-500 transition-colors font-medium">Features</Link>
              <Link to="/how-it-works" className="text-gray-600 hover:text-red-500 transition-colors font-medium">How it Works</Link>
              <Link to="/about" className="text-gray-600 hover:text-red-500 transition-colors font-medium">About</Link>
            </nav>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <Link 
                to="/login" 
                className="text-gray-700 hover:text-red-500 font-medium transition-colors"
              >
                Sign in
              </Link>
              <Link 
                to="/register" 
                className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:shadow-red-100 font-medium"
              >
                Get Started
              </Link>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-white">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden opacity-20">
            <div className="absolute -top-1/2 -right-1/4 w-full h-full bg-gradient-to-br from-red-100 to-transparent rounded-full mix-blend-multiply filter blur-3xl"></div>
            <div className="absolute -bottom-1/2 -left-1/4 w-full h-full bg-gradient-to-tr from-blue-100 to-transparent rounded-full mix-blend-multiply filter blur-3xl"></div>
          </div>
          
          <div className="relative max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8 inline-block px-4 py-2 rounded-full bg-red-50 text-red-600 text-sm font-medium"
            >
              🚀 Now with AI-powered insights
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight"
            >
              Take Control of Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">Financial Future</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed"
            >
              Simplify your financial life with our all-in-one money management platform. 
              Track expenses, analyze spending, and achieve your financial goals with ease.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16"
            >
              <Link 
                to="/register" 
                className="group relative inline-flex items-center justify-center px-8 py-4 overflow-hidden font-medium text-white bg-gradient-to-r from-red-500 to-orange-500 rounded-xl hover:shadow-xl hover:shadow-red-100 transition-all duration-300 ease-out hover:ring-2 hover:ring-red-400 hover:ring-offset-2"
              >
                <span className="relative">Get Started Free</span>
                <FiArrowRight className="ml-2 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              
              <Link 
                to="/login" 
                className="group flex items-center space-x-2 text-gray-700 hover:text-red-500 font-medium transition-colors px-6 py-4"
              >
                <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center group-hover:shadow-lg transition-shadow">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path>
                  </svg>
                </div>
                <span>Watch Demo</span>
              </Link>
            </motion.div>

            {/* Feature Highlights */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="relative mt-16"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {[
                  {
                    icon: <FiPieChart className="text-2xl text-red-500" />,
                    title: "Smart Analytics",
                    description: "Gain deep insights into your spending habits with beautiful, interactive dashboards.",
                    color: "red"
                  },
                  {
                    icon: <FiCamera className="text-2xl text-blue-500" />,
                    title: "Receipt OCR",
                    description: "Snap a photo of your receipt and let AI extract all the transaction details.",
                    color: "blue"
                  },
                  {
                    icon: <FiDollarSign className="text-2xl text-green-500" />,
                    title: "Easy Tracking",
                    description: "Effortlessly track income, expenses, and savings in one centralized platform.",
                    color: "green"
                  }
                ].map((feature, index) => (
                  <motion.div 
                    key={index}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className={`bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300`}
                  >
                    <div className={`w-14 h-14 rounded-xl bg-${feature.color}-50 flex items-center justify-center mb-6`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
              
              {/* Floating elements for visual interest */}
              <div className="absolute -z-10 -top-20 -right-20 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
              <div className="absolute -z-10 -bottom-20 -left-20 w-64 h-64 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="inline-block px-4 py-2 rounded-full bg-red-50 text-red-600 text-sm font-medium mb-4">
                Powerful Features
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Everything You Need to Succeed</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Our comprehensive suite of tools helps you take control of your financial life
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: <FiDollarSign className="text-2xl text-white" />,
                  bgColor: "bg-red-500",
                  title: "Smart Financial Management",
                  description: "Intelligent transaction categorization, custom categories & tags, and automated bill payments."
                },
                {
                  icon: <FiCamera className="text-2xl text-white" />,
                  bgColor: "bg-blue-500",
                  title: "Advanced Receipt Processing",
                  description: "Dual OCR engine with Tesseract.js and Google's Gemini Vision API for optimal text extraction."
                },
                {
                  icon: <FiPieChart className="text-2xl text-white" />,
                  bgColor: "bg-green-500",
                  title: "Advanced Analytics",
                  description: "Interactive dashboards, custom reports, and deep category analytics."
                },
                {
                  icon: <FiMessageSquare className="text-2xl text-white" />,
                  bgColor: "bg-purple-500",
                  title: "AI-Powered Financial Intelligence",
                  description: "Context-aware AI chat assistant with personalized financial advice."
                },
                {
                  icon: <FiCreditCard className="text-2xl text-white" />,
                  bgColor: "bg-yellow-500",
                  title: "Smart Category Management",
                  description: "Automated categorization with AI and custom category support."
                },
                {
                  icon: <FiDatabase className="text-2xl text-white" />,
                  bgColor: "bg-indigo-500",
                  title: "PDF Statement Import",
                  description: "Import transaction history from PDF statements"
                }
              ].map((feature, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="group bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-24 bg-gradient-to-r from-red-500 to-orange-500 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgcGF0dGVyblRyYW5zZm9ybT0icm90YXRlKDQ1KSI+PHJlY3Qgd2lkdGg9IjUwJSIgaGVpZ2h0PSI1MCUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjcGF0dGVybikiLz48L3N2Zz4=')] opacity-20"></div>
          </div>
          
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-bold text-white mb-6"
            >
              Ready to Transform Your Finances?
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-xl text-white/90 mb-10 max-w-2xl mx-auto"
            >
              Join thousands of users who have already taken control of their financial future
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6"
            >
              <Link 
                to="/register" 
                className="group relative inline-flex items-center justify-center px-8 py-4 overflow-hidden font-medium text-red-600 bg-white rounded-xl hover:shadow-2xl hover:shadow-white/20 transition-all duration-300 ease-out hover:ring-2 hover:ring-white hover:ring-offset-2"
              >
                <span className="relative">Get Started Free</span>
                <FiArrowRight className="ml-2 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              
              <Link 
                to="/login" 
                className="group flex items-center space-x-2 text-white/90 hover:text-white font-medium transition-colors px-6 py-3.5 border-2 border-white/30 hover:border-white rounded-lg"
              >
                <span>Sign In</span>
                <FiArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <FiDollarSign className="text-white text-xl" />
                </div>
                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-orange-400">FinanceTracker</span>
              </div>
              <p className="text-gray-400 mb-6">
                Take control of your financial future with our powerful yet simple personal finance tools.
              </p>
              <div className="flex space-x-4">
                {['Twitter', 'GitHub', 'LinkedIn'].map((social) => (
                  <a 
                    key={social} 
                    href="#" 
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label={social}
                  >
                    <span className="sr-only">{social}</span>
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors">
                      {social === 'Twitter' ? '🐦' : social === 'GitHub' ? '💻' : '🔗'}
                    </div>
                  </a>
                ))}
              </div>
            </div>
            
            {[
              {
                title: 'Product',
                links: ['Features', 'Pricing', 'Updates', 'Roadmap']
              },
              {
                title: 'Company',
                links: ['About Us', 'Careers', 'Blog', 'Contact']
              },
              {
                title: 'Legal',
                links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR']
              }
            ].map((section, index) => (
              <div key={index}>
                <h3 className="text-lg font-semibold text-white mb-6">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map((link, i) => (
                    <li key={i}>
                      <a 
                        href="#" 
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} FinanceTracker. All rights reserved.
            </p>
            <p className="text-gray-500 text-sm">
              Made with ❤️ by AJ Harsh Vardhan
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 
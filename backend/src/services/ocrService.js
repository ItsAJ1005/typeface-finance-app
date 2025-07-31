const Tesseract = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');

// Category mapping based on merchant names and keywords
const categoryMappings = {
  'Food & Dining': [
    'restaurant', 'cafe', 'food', 'pizza', 'burger', 'hotel', 'dhaba', 'canteen',
    'mcdonald', 'kfc', 'dominos', 'pizza hut', 'subway', 'cafe coffee day',
    'starbucks', 'chai', 'tea', 'swiggy', 'zomato', 'uber eats'
  ],
  'Transportation': [
    'uber', 'ola', 'taxi', 'auto', 'bus', 'metro', 'railway', 'petrol', 'diesel',
    'fuel', 'gas', 'station', 'transport', 'parking', 'toll', 'rapido'
  ],
  'Shopping': [
    'mall', 'store', 'shop', 'market', 'bazaar', 'amazon', 'flipkart', 'myntra',
    'clothing', 'fashion', 'shoes', 'electronics', 'mobile', 'laptop'
  ],
  'Healthcare': [
    'hospital', 'clinic', 'doctor', 'medical', 'pharmacy', 'medicine', 'health',
    'apollo', 'fortis', 'max', 'aiims', 'dental'
  ],
  'Utilities': [
    'electricity', 'water', 'gas', 'internet', 'wifi', 'mobile', 'phone',
    'broadband', 'cable', 'dish', 'airtel', 'jio', 'vodafone', 'bsnl'
  ],
  'Entertainment': [
    'movie', 'cinema', 'theatre', 'pvr', 'inox', 'game', 'park', 'mall',
    'netflix', 'amazon prime', 'hotstar', 'spotify', 'youtube'
  ]
};

// Extract text from image using Tesseract
const extractTextFromImage = async (imagePath) => {
  try {
    console.log('Starting OCR for:', imagePath);
    
    const result = await Tesseract.recognize(imagePath, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    return result.data.text;
  } catch (error) {
    console.error('OCR extraction error:', error);
    throw new Error('Failed to extract text from image');
  }
};

// Parse receipt text to extract transaction details
const parseReceiptText = (text) => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let amount = null;
  let merchant = null;
  let date = null;
  let items = [];

  // Enhanced amount extraction patterns for Indian receipts
  const amountPatterns = [
    /(?:total|amount|grand total|net amount|payable)[:\s]*(?:rs\.?|₹)?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /(?:rs\.?|₹)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/g,
    /(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:rs\.?|₹)/g,
    /total[:\s]+(\d+(?:,\d+)*(?:\.\d{2})?)/i
  ];

  // Date patterns for Indian formats
  const datePatterns = [
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
    /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{2,4})/i,
    /(?:date|dt)[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i
  ];

  // Extract amount
  for (const pattern of amountPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      let extractedAmount = matches[1] || matches[0];
      extractedAmount = extractedAmount.replace(/[^\d.,]/g, '').replace(/,/g, '');
      const numAmount = parseFloat(extractedAmount);
      
      if (numAmount && numAmount > 0 && numAmount < 100000) { // Reasonable range
        amount = numAmount;
        break;
      }
    }
  }

  // Extract date
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const dateStr = match[1];
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate;
        break;
      }
    }
  }

  // Extract merchant name (usually in first few lines)
  const topLines = lines.slice(0, 5);
  for (const line of topLines) {
    if (line.length > 3 && line.length < 50 && 
        !line.match(/\d+/) && 
        !line.toLowerCase().includes('receipt') &&
        !line.toLowerCase().includes('bill')) {
      merchant = line;
      break;
    }
  }

  // Extract items (lines with prices)
  for (const line of lines) {
    if (line.match(/(\d+(?:\.\d{2})?)\s*(?:rs\.?|₹)|(?:rs\.?|₹)\s*(\d+(?:\.\d{2})?)/i)) {
      const itemName = line.replace(/[\d\s₹rs\.-]/gi, '').trim();
      if (itemName.length > 2) {
        items.push(itemName);
      }
    }
  }

  return {
    amount,
    merchant,
    date,
    items,
    rawText: text
  };
};

// Determine category based on merchant and items
const determineCategory = (merchant, items) => {
  const searchText = `${merchant} ${items.join(' ')}`.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categoryMappings)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  
  return 'Others'; // Default category
};

// Main function to process receipt
const processReceipt = async (imagePath) => {
  try {
    // Check if file exists
    await fs.access(imagePath);
    
    // Extract text using OCR
    const extractedText = await extractTextFromImage(imagePath);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the image');
    }

    // Parse the extracted text
    const parsed = parseReceiptText(extractedText);
    
    if (!parsed.amount) {
      throw new Error('Could not extract amount from receipt');
    }

    // Determine category
    const category = determineCategory(parsed.merchant || '', parsed.items);
    
    // Generate description
    let description = '';
    if (parsed.merchant) {
      description = `Purchase at ${parsed.merchant}`;
    }
    if (parsed.items.length > 0) {
      description += parsed.items.length > 0 ? ` - ${parsed.items.slice(0, 3).join(', ')}` : '';
    }

    return {
      success: true,
      data: {
        amount: parsed.amount,
        category,
        description: description || 'Receipt purchase',
        date: parsed.date || new Date(),
        merchant: parsed.merchant,
        items: parsed.items,
        confidence: calculateConfidence(parsed)
      },
      rawData: {
        extractedText,
        parsed
      }
    };

  } catch (error) {
    console.error('Receipt processing error:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
};

// Calculate confidence score based on extracted data quality
const calculateConfidence = (parsed) => {
  let score = 0;
  
  if (parsed.amount) score += 40;
  if (parsed.merchant) score += 30;
  if (parsed.date) score += 20;
  if (parsed.items.length > 0) score += 10;
  
  return Math.min(score, 100);
};

// Clean up uploaded files (optional)
const cleanupFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    console.log('Cleaned up file:', filePath);
  } catch (error) {
    console.warn('Could not cleanup file:', filePath, error.message);
  }
};

module.exports = {
  processReceipt,
  extractTextFromImage,
  parseReceiptText,
  determineCategory,
  cleanupFile
};
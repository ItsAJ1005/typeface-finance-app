const Tesseract = require('tesseract.js');
const fs = require('fs').promises;
const sharp = require('sharp'); // For image preprocessing
const path = require('path');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Google Generative AI
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

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

// Assess image quality and detect blur
const assessImageQuality = async (imagePath) => {
  try {
    const metadata = await sharp(imagePath).metadata();
    const stats = await sharp(imagePath).stats();
    
    // Calculate image quality metrics
    const quality = {
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      hasAlpha: metadata.hasAlpha,
      density: metadata.density,
      contrast: calculateContrast(stats),
      isLowResolution: metadata.width < 800 || metadata.height < 600,
      needsPreprocessing: false
    };
    
    // Determine if preprocessing is needed
    if (quality.isLowResolution || quality.contrast < 50) {
      quality.needsPreprocessing = true;
    }
    
    return quality;
  } catch (error) {
    console.warn('Could not assess image quality:', error.message);
    return { needsPreprocessing: true }; // Default to preprocessing if assessment fails
  }
};

// Calculate contrast from image statistics
const calculateContrast = (stats) => {
  try {
    // Simple contrast calculation based on standard deviation
    if (stats.channels && stats.channels.length > 0) {
      const avgStdDev = stats.channels.reduce((sum, channel) => sum + channel.stdev, 0) / stats.channels.length;
      return avgStdDev;
    }
    return 50; // Default moderate contrast
  } catch (error) {
    return 50;
  }
};

// Preprocess image to improve OCR accuracy
const preprocessImage = async (imagePath, outputPath) => {
  try {
    console.log('Preprocessing image for better OCR...');
    
    await sharp(imagePath)
      .resize(null, 2000, { // Upscale height to 2000px if smaller
        withoutEnlargement: false,
        kernel: sharp.kernel.lanczos3
      })
      .sharpen({
        sigma: 1.5,      // Sharpening to counteract blur
        flat: 1.0,
        jagged: 2.0
      })
      .normalize()       // Normalize contrast
      .modulate({
        brightness: 1.1, // Slight brightness increase
        saturation: 0.8, // Reduce saturation for better text recognition
        hue: 0
      })
      .grayscale()       // Convert to grayscale for better OCR
      .jpeg({ quality: 95 })
      .toFile(outputPath);
    
    console.log('Image preprocessing completed');
    return outputPath;
  } catch (error) {
    console.warn('Image preprocessing failed:', error.message);
    return imagePath; // Return original if preprocessing fails
  }
};

// Enhanced OCR with multiple attempts and configurations
const extractTextFromImageEnhanced = async (imagePath) => {
  try {
    console.log('Starting enhanced OCR for:', imagePath);
    
    // Assess image quality first
    const quality = await assessImageQuality(imagePath);
    
    let processedImagePath = imagePath;
    let tempFiles = [];
    
    // Preprocess image if needed
    if (quality.needsPreprocessing) {
      const preprocessedPath = imagePath.replace(/\.[^.]+$/, '_processed.jpg');
      processedImagePath = await preprocessImage(imagePath, preprocessedPath);
      tempFiles.push(preprocessedPath);
    }
    
    // OCR configurations to try (in order of preference)
    const ocrConfigs = [
      {
        name: 'standard',
        options: {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      },
      {
        name: 'enhanced',
        options: {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`Enhanced OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          },
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
          tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
          preserve_interword_spaces: '1'
        }
      },
      {
        name: 'aggressive',
        options: {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`Aggressive OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          },
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
          tessedit_ocr_engine_mode: Tesseract.OEM.DEFAULT,
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ₹Rs.-/:,',
          preserve_interword_spaces: '1'
        }
      }
    ];
    
    let bestResult = null;
    let highestConfidence = 0;
    
    // Try different OCR configurations
    for (const config of ocrConfigs) {
      try {
        console.log(`Attempting OCR with ${config.name} configuration...`);
        
        const result = await Tesseract.recognize(processedImagePath, 'eng', config.options);
        const extractedText = result.data.text.trim();
        const confidence = result.data.confidence;
        
        console.log(`${config.name} OCR confidence: ${confidence}%`);
        console.log(`Extracted text length: ${extractedText.length} characters`);
        
        if (extractedText.length > 0 && confidence > highestConfidence) {
          bestResult = {
            text: extractedText,
            confidence: confidence,
            config: config.name
          };
          highestConfidence = confidence;
        }
        
        // If we get good confidence, use this result
        if (confidence > 70 && extractedText.length > 20) {
          console.log(`Good confidence achieved with ${config.name} config`);
          break;
        }
        
      } catch (configError) {
        console.warn(`OCR with ${config.name} configuration failed:`, configError.message);
        continue;
      }
    }
    
    // Cleanup temporary files
    for (const tempFile of tempFiles) {
      try {
        await fs.unlink(tempFile);
      } catch (cleanupError) {
        console.warn('Could not cleanup temp file:', tempFile);
      }
    }
    
    if (!bestResult || bestResult.text.length === 0) {
      throw new Error('No text could be extracted from image. The image may be too blurry, low quality, or contain no readable text.');
    }
    
    if (bestResult.confidence < 30) {
      console.warn(`Low OCR confidence (${bestResult.confidence}%). Results may be inaccurate.`);
    }
    
    return {
      text: bestResult.text,
      confidence: bestResult.confidence,
      method: bestResult.config,
      qualityInfo: quality
    };
    
  } catch (error) {
    console.error('Enhanced OCR extraction error:', error);
    
    // Provide more specific error messages based on common issues
    if (error.message.includes('ENOENT')) {
      throw new Error('Image file not found or cannot be accessed');
    } else if (error.message.includes('invalid')) {
      throw new Error('Invalid image format. Please use JPG, PNG, or other supported formats');
    } else {
      throw new Error(`Failed to extract text from image: ${error.message}`);
    }
  }
};

// Extract text from PDF using pdf-parse
const extractTextFromPDF = async (pdfPath) => {
  try {
    console.log('Starting PDF parsing for:', pdfPath);
    
    const dataBuffer = await fs.readFile(pdfPath);
    const data = await pdfParse(dataBuffer);
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF contains no extractable text. It may be a scanned image PDF.');
    }
    
    return {
      text: data.text,
      confidence: 95, // PDFs typically have high confidence
      method: 'pdf-parse'
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

// Parse receipt text to extract transaction details
const parseReceiptText = (extractedData) => {
  const text = extractedData.text || extractedData;
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

  // Enhanced amount extraction with multiple patterns and validation
  const amountMatches = [];
  
  // First pass: Try to find all potential amounts
  for (const pattern of amountPatterns) {
    const regex = new RegExp(pattern, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      let extractedAmount = match[1] || match[0];
      extractedAmount = extractedAmount.replace(/[^\d.,]/g, '').replace(/,/g, '');
      const numAmount = parseFloat(extractedAmount);
      
      // Only consider reasonable amounts
      if (numAmount && numAmount > 0 && numAmount < 100000) {
        amountMatches.push(numAmount);
      }
    }
  }
  
  // If we found multiple amounts, use the highest one (often the total)
  if (amountMatches.length > 0) {
    amount = Math.max(...amountMatches);
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

  // Calculate confidence based on extracted data
  let confidence = 0;
  if (amount) confidence += 40;
  if (merchant) confidence += 20;
  if (date) confidence += 10;
  if (items.length > 0) confidence += 10;
  
  // If we have extraction info, factor it into confidence
  if (extractedData?.confidence) {
    confidence = Math.round((confidence * 0.7) + (extractedData.confidence * 0.3));
  }
  
  return {
    amount,
    merchant,
    date,
    items,
    rawText: text,
    confidence,
    extractionInfo: {
      confidence: extractedData?.confidence || confidence,
      method: extractedData?.method || 'manual',
      qualityInfo: extractedData?.qualityInfo || {},
      extractedAmounts: amountMatches,
      extractionWarnings: !amount ? ['Could not extract amount from receipt'] : []
    }
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

// Calculate confidence score based on extracted data quality
const calculateOverallConfidence = (parsed) => {
  let score = 0;
  
  if (parsed.amount) score += 40;
  if (parsed.merchant) score += 30;
  if (parsed.date) score += 20;
  if (parsed.items.length > 0) score += 10;
  
  // Factor in OCR confidence if available
  if (parsed.extractionInfo && parsed.extractionInfo.confidence) {
    const ocrConfidence = parsed.extractionInfo.confidence;
    score = Math.round(score * (ocrConfidence / 100));
  }
  
  return Math.min(score, 100);
};

// Extract text using Gemini Vision API
const extractTextWithGemini = async (filePath, mimeType) => {
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }

  try {
    console.log('Attempting to extract text with Gemini...');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
    
    // Read file data
    const imageData = await fs.readFile(filePath);
    const base64Data = imageData.toString('base64');
    
    const prompt = `Extract the following information from this receipt in JSON format with these fields: {"amount": number, "merchant": string, "date": string (YYYY-MM-DD), "items": string[]}. Only respond with the JSON object, no other text.`;
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    // Try to parse the response as JSON
    try {
      const parsed = JSON.parse(text);
      return {
        text: JSON.stringify(parsed), // Store the raw JSON as text
        confidence: 90, // High confidence for Gemini
        method: 'gemini-vision',
        parsedData: parsed // Store the parsed data for easier access
      };
    } catch (e) {
      // If parsing fails, return the raw text
      return {
        text: text,
        confidence: 70,
        method: 'gemini-vision',
        rawResponse: text
      };
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`Gemini API failed: ${error.message}`);
  }
};

// Main function to process receipt with enhanced blur handling and Gemini fallback
const processReceipt = async (filePath, mimeType = 'image/jpeg') => {
  try {
    // Check if file exists
    await fs.access(filePath);
    
    let extractedData;
    let usedFallback = false;
    
    // First attempt with Tesseract
    try {
      // Extract text based on file type
      if (mimeType === 'application/pdf') {
        extractedData = await extractTextFromPDF(filePath);
      } else {
        extractedData = await extractTextFromImageEnhanced(filePath);
      }
      
      // If Tesseract returns low confidence or no text, try Gemini
      if ((extractedData.confidence < 50 || !extractedData.text || extractedData.text.trim().length < 20) && genAI) {
        console.log('Low confidence in Tesseract, falling back to Gemini...');
        try {
          const geminiData = await extractTextWithGemini(filePath, mimeType);
          extractedData = geminiData;
          usedFallback = true;
        } catch (geminiError) {
          console.warn('Gemini fallback failed, using Tesseract results:', geminiError.message);
        }
      }
    } catch (tesseractError) {
      console.warn('Tesseract extraction failed, trying Gemini...', tesseractError.message);
      if (genAI) {
        try {
          extractedData = await extractTextWithGemini(filePath, mimeType);
          usedFallback = true;
        } catch (geminiError) {
          console.error('Both Tesseract and Gemini failed:', geminiError.message);
          throw new Error('Failed to extract text with both Tesseract and Gemini');
        }
      } else {
        throw tesseractError;
      }
    }
    
    if (!extractedData.text || extractedData.text.trim().length === 0) {
      throw new Error('No text could be extracted from the file. The image may be too blurry or contain no readable text.');
    }

    // Parse the extracted text
    let parsed;
    if (usedFallback && extractedData.parsedData) {
      // If we used Gemini and got parsed data, use it directly
      parsed = extractedData.parsedData;
      parsed.rawText = extractedData.text;
      // Ensure required fields
      parsed.amount = parsed.amount || null;
      parsed.merchant = parsed.merchant || null;
      parsed.date = parsed.date ? new Date(parsed.date) : null;
      parsed.items = parsed.items || [];
    } else {
      // Otherwise, use the existing parser
      parsed = parseReceiptText(extractedData);
    }
    
    // Instead of throwing an error, we'll include the warning in the result
    // This allows the user to manually enter the amount if needed
    if (!parsed.amount) {
      parsed.extractionInfo.extractionWarnings.push(
        'Could not extract amount from receipt. Please enter it manually.'
      );
      // Set a default amount of 0 to prevent validation errors
      parsed.amount = 0;
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

    const overallConfidence = calculateOverallConfidence(parsed);

    return {
      amount: parsed.amount,
      category,
      description: description || 'Receipt purchase',
      date: parsed.date || new Date(),
      merchant: parsed.merchant,
      items: parsed.items,
      rawText: extractedData.text,
      confidence: overallConfidence,
      extractionDetails: {
        ocrConfidence: extractedData.confidence,
        method: extractedData.method,
        qualityInfo: extractedData.qualityInfo,
        usedFallback: usedFallback
      }
    };

  } catch (error) {
    console.error('Receipt processing error:', error);
    throw new Error(error.message || 'Failed to process receipt');
  }
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
  extractTextFromImageEnhanced,
  extractTextFromPDF,
  parseReceiptText,
  determineCategory,
  cleanupFile,
  assessImageQuality,
  preprocessImage
};
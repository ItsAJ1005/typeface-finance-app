const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const ocrService = require('../services/ocrService');
const Transaction = require('../models/Transaction');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'uploads/receipts';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images and PDFs
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG) and PDF files are allowed'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter
});

// Upload and process receipt
const uploadReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const fileUrl = `/uploads/receipts/${req.file.filename}`;

    // Process the receipt using OCR
    const ocrResult = await ocrService.processReceipt(filePath);

    if (!ocrResult.success) {
      // Clean up the uploaded file
      await ocrService.cleanupFile(filePath);
      
      return res.status(400).json({
        success: false,
        message: ocrResult.error || 'Failed to process receipt',
        details: 'Could not extract transaction data from the uploaded receipt'
      });
    }

    // Generate receipt ID
    const receiptId = uuidv4();

    // Prepare transaction data
    const transactionData = {
      receiptId,
      receiptUrl: fileUrl,
      ...ocrResult.data,
      type: 'expense', // Receipts are typically expenses
      isFromReceipt: true
    };

    res.json({
      success: true,
      message: 'Receipt processed successfully',
      data: {
        receiptId,
        receiptUrl: fileUrl,
        extractedData: transactionData,
        confidence: ocrResult.data.confidence,
        suggestions: {
          amount: ocrResult.data.amount,
          category: ocrResult.data.category,
          description: ocrResult.data.description,
          date: ocrResult.data.date
        }
      }
    });

  } catch (error) {
    console.error('Receipt upload error:', error);
    
    // Clean up file if it exists
    if (req.file) {
      await ocrService.cleanupFile(req.file.path);
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.'
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload and process receipt'
    });
  }
};

// Create transaction from processed receipt
const createTransactionFromReceipt = async (req, res) => {
  try {
    const {
      receiptId,
      amount,
      category,
      description,
      date,
      receiptUrl
    } = req.body;

    if (!receiptId || !amount || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: receiptId, amount, and category are required'
      });
    }

    // Create transaction
    const transaction = new Transaction({
      userId: req.userId,
      type: 'expense',
      amount: parseFloat(amount),
      category,
      description: description || '',
      date: date ? new Date(date) : new Date(),
      receiptId,
      receiptUrl,
      isFromReceipt: true
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      message: 'Transaction created from receipt successfully',
      data: { transaction }
    });

  } catch (error) {
    console.error('Create transaction from receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction from receipt'
    });
  }
};

// Get receipt details
const getReceipt = async (req, res) => {
  try {
    const { receiptId } = req.params;

    // Find transaction associated with this receipt
    const transaction = await Transaction.findOne({
      receiptId,
      userId: req.userId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    res.json({
      success: true,
      data: {
        receiptId,
        receiptUrl: transaction.receiptUrl,
        transaction
      }
    });

  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve receipt'
    });
  }
};

// Delete receipt and associated transaction
const deleteReceipt = async (req, res) => {
  try {
    const { receiptId } = req.params;

    // Find and delete transaction
    const transaction = await Transaction.findOneAndDelete({
      receiptId,
      userId: req.userId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    // Clean up the physical file
    if (transaction.receiptUrl) {
      const filePath = path.join(process.cwd(), transaction.receiptUrl);
      await ocrService.cleanupFile(filePath);
    }

    res.json({
      success: true,
      message: 'Receipt and associated transaction deleted successfully'
    });

  } catch (error) {
    console.error('Delete receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete receipt'
    });
  }
};

// Reprocess existing receipt (useful for improving OCR)
const reprocessReceipt = async (req, res) => {
  try {
    const { receiptId } = req.params;

    // Find transaction with this receipt
    const transaction = await Transaction.findOne({
      receiptId,
      userId: req.userId
    });

    if (!transaction || !transaction.receiptUrl) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    const filePath = path.join(process.cwd(), transaction.receiptUrl);

    // Reprocess the receipt
    const ocrResult = await ocrService.processReceipt(filePath);

    if (!ocrResult.success) {
      return res.status(400).json({
        success: false,
        message: ocrResult.error || 'Failed to reprocess receipt'
      });
    }

    res.json({
      success: true,
      message: 'Receipt reprocessed successfully',
      data: {
        receiptId,
        originalTransaction: transaction,
        newSuggestions: {
          amount: ocrResult.data.amount,
          category: ocrResult.data.category,
          description: ocrResult.data.description,
          date: ocrResult.data.date
        },
        confidence: ocrResult.data.confidence
      }
    });

  } catch (error) {
    console.error('Reprocess receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reprocess receipt'
    });
  }
};

module.exports = {
  upload,
  uploadReceipt,
  createTransactionFromReceipt,
  getReceipt,
  deleteReceipt,
  reprocessReceipt
};
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { auth } = require('../middleware/auth');
const { processReceipt } = require('../services/ocrService');
const Transaction = require('../models/Transaction');

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `receipt-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG images and PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload and process receipt
router.post('/upload', auth, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.filename;
    const fileUrl = `/uploads/${fileName}`;

    // Process receipt using OCR
    const extractedData = await processReceipt(filePath, req.file.mimetype);

    // Create transaction if data extracted successfully
    let transaction = null;
    if (extractedData.amount && extractedData.amount > 0) {
      transaction = new Transaction({
        userId: req.userId,
        type: 'expense', // Receipts are typically for expenses
        amount: extractedData.amount,
        category: extractedData.category || 'Others',
        description: extractedData.description || `Receipt from ${extractedData.merchant || 'Unknown'}`,
        date: extractedData.date || new Date(),
        receiptId: fileName,
        receiptUrl: fileUrl,
        isFromReceipt: true
      });

      await transaction.save();
    }

    res.json({
      success: true,
      message: 'Receipt processed successfully',
      data: {
        extractedData,
        transaction,
        fileUrl,
        fileName
      }
    });

  } catch (error) {
    console.error('Receipt upload error:', error);
    
    // Clean up uploaded file if processing failed
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete uploaded file:', unlinkError);
      }
    }

    if (error.message.includes('Only JPEG, PNG')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process receipt'
    });
  }
});

// Get receipt details
router.get('/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    // Find associated transaction
    const transaction = await Transaction.findOne({
      userId: req.userId,
      receiptId: filename
    });

    res.json({
      success: true,
      data: {
        filename,
        url: `/uploads/${filename}`,
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
});

// Delete receipt and associated transaction
router.delete('/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);

    // Find and delete associated transaction
    const transaction = await Transaction.findOneAndDelete({
      userId: req.userId,
      receiptId: filename
    });

    // Delete file
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.log('File not found or already deleted:', filename);
    }

    res.json({
      success: true,
      message: 'Receipt and associated transaction deleted successfully',
      data: { deletedTransaction: transaction }
    });

  } catch (error) {
    console.error('Delete receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete receipt'
    });
  }
});

// Process receipt manually (re-process)
router.post('/:filename/reprocess', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    // Determine file type
    const extension = path.extname(filename).toLowerCase();
    const mimeType = extension === '.pdf' ? 'application/pdf' : 'image/jpeg';

    // Re-process receipt
    const extractedData = await processReceipt(filePath, mimeType);

    res.json({
      success: true,
      message: 'Receipt reprocessed successfully',
      data: { extractedData }
    });

  } catch (error) {
    console.error('Reprocess receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reprocess receipt'
    });
  }
});

module.exports = router;
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { auth } = require('../middleware/auth');
const { processReceipt, assessImageQuality } = require('../services/ocrService');
const Transaction = require('../models/Transaction');

const router = express.Router();

// In-memory storage for receipts when MongoDB is not available
const inMemoryReceipts = new Map();

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
    fileSize: 10 * 1024 * 1024 // Increased to 10MB to allow higher quality images
  }
});

// Helper function to determine processing status and recommendations
const getProcessingRecommendations = (extractedData, confidence) => {
  const recommendations = [];
  let status = 'success';
  
  if (confidence < 30) {
    status = 'poor_quality';
    recommendations.push('The image quality is very poor. Consider taking a new photo with better lighting.');
    recommendations.push('Ensure the receipt is flat and the camera is steady.');
  } else if (confidence < 60) {
    status = 'low_confidence';
    recommendations.push('The image quality could be improved for better accuracy.');
    recommendations.push('Try taking the photo in better lighting or closer to the receipt.');
  }
  
  if (!extractedData.amount) {
    recommendations.push('Could not detect the total amount. Please verify the receipt shows a clear total.');
  }
  
  if (!extractedData.merchant) {
    recommendations.push('Could not identify the merchant name. This may affect expense categorization.');
  }
  
  if (!extractedData.date) {
    recommendations.push('Could not detect the transaction date. You may need to enter this manually.');
  }
  
  return { status, recommendations };
};

// Upload and process receipt with enhanced error handling
router.post('/upload', auth, upload.single('receipt'), async (req, res) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        error: 'FILE_MISSING'
      });
    }

    filePath = req.file.path;
    const fileName = req.file.filename;
    const fileUrl = `/uploads/${fileName}`;

    console.log(`Processing receipt: ${fileName} (${req.file.mimetype})`);

    // Quick quality check for images (not PDFs)
    let qualityInfo = null;
    if (req.file.mimetype.startsWith('image/')) {
      try {
        qualityInfo = await assessImageQuality(filePath);
        console.log('Image quality assessment:', qualityInfo);
      } catch (qualityError) {
        console.warn('Could not assess image quality:', qualityError.message);
      }
    }

    // Process receipt using OCR
    let extractedData;
    let processingError = null;
    
    try {
      extractedData = await processReceipt(filePath, req.file.mimetype);
      console.log('OCR processing completed successfully');
    } catch (ocrError) {
      console.error('OCR processing failed:', ocrError.message);
      processingError = ocrError;
      
      // Provide fallback response for failed OCR
      extractedData = {
        amount: null,
        category: 'Others',
        description: 'Manual entry required',
        date: new Date(),
        merchant: null,
        items: [],
        confidence: 0,
        extractionDetails: {
          ocrConfidence: 0,
          method: 'failed',
          qualityInfo: qualityInfo
        }
      };
    }

    // Get processing recommendations
    const confidence = extractedData.confidence || 0;
    const recommendations = getProcessingRecommendations(extractedData, confidence);

    // Create transaction only if we have meaningful data or user explicitly wants to save
    let transaction = null;
    const shouldCreateTransaction = extractedData.amount && extractedData.amount > 0;
    
    if (shouldCreateTransaction) {
      try {
        transaction = new Transaction({
          userId: req.userId,
          type: 'expense',
          amount: extractedData.amount,
          category: extractedData.category || 'Others',
          description: extractedData.description || `Receipt from ${extractedData.merchant || 'Unknown'}`,
          date: extractedData.date || new Date(),
          receiptId: fileName,
          receiptUrl: fileUrl,
          isFromReceipt: true,
          processingConfidence: confidence,
          needsReview: confidence < 60 || !extractedData.amount
        });

        await transaction.save();
        console.log('Transaction created successfully');
      } catch (dbError) {
        console.log('Database not available, storing in memory');
        // Store in memory if database is not available
        inMemoryReceipts.set(fileName, {
          userId: req.userId,
          type: 'expense',
          amount: extractedData.amount,
          category: extractedData.category || 'Others',
          description: extractedData.description || `Receipt from ${extractedData.merchant || 'Unknown'}`,
          date: extractedData.date || new Date(),
          receiptId: fileName,
          receiptUrl: fileUrl,
          isFromReceipt: true,
          processingConfidence: confidence,
          needsReview: confidence < 60 || !extractedData.amount,
          extractedData: extractedData
        });
        transaction = inMemoryReceipts.get(fileName);
      }
    }

    // Prepare response
    const response = {
      success: true,
      message: processingError ? 'Receipt uploaded but processing failed' : 'Receipt processed successfully',
      data: {
        extractedData,
        transaction,
        fileUrl,
        fileName,
        processingInfo: {
          confidence,
          status: recommendations.status,
          needsReview: confidence < 60 || !extractedData.amount,
          recommendations: recommendations.recommendations,
          qualityInfo: qualityInfo
        }
      }
    };

    // Add warning for low confidence results
    if (confidence < 60 && confidence > 0) {
      response.warning = 'Low confidence in extracted data. Please review and correct if necessary.';
    }

    if (processingError) {
      response.processingError = processingError.message;
      response.success = false; // Mark as failed if OCR completely failed
    }

    res.status(processingError ? 422 : 200).json(response);

  } catch (error) {
    console.error('Receipt upload error:', error);
    
    // Clean up uploaded file if processing failed
    if (filePath) {
      try {
        await fs.unlink(filePath);
        console.log('Cleaned up uploaded file after error');
      } catch (unlinkError) {
        console.error('Failed to delete uploaded file:', unlinkError);
      }
    }

    // Handle specific error types
    if (error.message.includes('Only JPEG, PNG')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error: 'INVALID_FILE_TYPE'
      });
    }

    if (error.message.includes('File too large')) {
      return res.status(413).json({
        success: false,
        message: 'File size too large. Please upload an image smaller than 10MB.',
        error: 'FILE_TOO_LARGE'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process receipt. Please try again or contact support.',
      error: 'PROCESSING_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all receipts for user with processing status
router.get('/', auth, async (req, res) => {
  try {
    let receipts = [];
    
    try {
      // Find all transactions that have receipts
      const transactions = await Transaction.find({
        userId: req.userId,
        receiptId: { $exists: true, $ne: null }
      }).sort({ createdAt: -1 });

      // Format receipts data with processing information
      receipts = transactions.map(transaction => ({
        _id: transaction.receiptId,
        filename: transaction.receiptId,
        fileSize: 0,
        uploadDate: transaction.createdAt,
        processingStatus: {
          confidence: transaction.processingConfidence || 0,
          needsReview: transaction.needsReview || false,
          status: transaction.processingConfidence < 30 ? 'poor_quality' : 
                  transaction.processingConfidence < 60 ? 'low_confidence' : 'success'
        },
        extractedData: {
          amount: transaction.amount,
          merchant: transaction.description?.replace('Receipt from ', '') || 'Unknown',
          date: transaction.date,
          category: transaction.category,
          description: transaction.description
        }
      }));
    } catch (dbError) {
      console.log('Database not available, using in-memory receipts');
      // Use in-memory storage if database is not available
      receipts = Array.from(inMemoryReceipts.values())
        .filter(receipt => receipt.userId === req.userId)
        .map(receipt => ({
          _id: receipt.receiptId,
          filename: receipt.receiptId,
          fileSize: 0,
          uploadDate: receipt.date,
          processingStatus: {
            confidence: receipt.processingConfidence || 0,
            needsReview: receipt.needsReview || false,
            status: receipt.processingConfidence < 30 ? 'poor_quality' : 
                    receipt.processingConfidence < 60 ? 'low_confidence' : 'success'
          },
          extractedData: receipt.extractedData || {
            amount: receipt.amount,
            merchant: receipt.description?.replace('Receipt from ', '') || 'Unknown',
            date: receipt.date,
            category: receipt.category,
            description: receipt.description
          }
        }));
    }

    res.json({
      success: true,
      data: { receipts }
    });

  } catch (error) {
    console.error('Get receipts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve receipts'
    });
  }
});

// Get receipt details with processing information
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
        message: 'Receipt not found',
        error: 'FILE_NOT_FOUND'
      });
    }

    // Find associated transaction
    const transaction = await Transaction.findOne({
      userId: req.userId,
      receiptId: filename
    });

    // Get file stats
    const stats = await fs.stat(filePath);

    res.json({
      success: true,
      data: {
        filename,
        url: `/uploads/${filename}`,
        fileSize: stats.size,
        uploadDate: stats.birthtime,
        transaction,
        processingInfo: transaction ? {
          confidence: transaction.processingConfidence || 0,
          needsReview: transaction.needsReview || false,
          status: transaction.processingConfidence < 30 ? 'poor_quality' : 
                  transaction.processingConfidence < 60 ? 'low_confidence' : 'success'
        } : null
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
      console.log('Deleted file:', filename);
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

// Enhanced reprocess endpoint with better error handling
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
        message: 'Receipt not found',
        error: 'FILE_NOT_FOUND'
      });
    }

    // Determine file type
    const extension = path.extname(filename).toLowerCase();
    const mimeType = extension === '.pdf' ? 'application/pdf' : 'image/jpeg';

    console.log(`Reprocessing receipt: ${filename}`);

    // Re-process receipt with enhanced error handling
    let extractedData;
    let processingError = null;
    
    try {
      extractedData = await processReceipt(filePath, mimeType);
    } catch (ocrError) {
      console.error('Reprocessing failed:', ocrError.message);
      processingError = ocrError;
      extractedData = {
        amount: null,
        category: 'Others',
        description: 'Manual entry required',
        date: new Date(),
        merchant: null,
        items: [],
        confidence: 0
      };
    }

    const confidence = extractedData.confidence || 0;
    const recommendations = getProcessingRecommendations(extractedData, confidence);

    // Update associated transaction if exists and we have good data
    const transaction = await Transaction.findOne({
      userId: req.userId,
      receiptId: filename
    });

    if (transaction && extractedData.amount && confidence > 30) {
      transaction.amount = extractedData.amount;
      transaction.category = extractedData.category || transaction.category;
      transaction.description = extractedData.description || transaction.description;
      transaction.date = extractedData.date || transaction.date;
      transaction.processingConfidence = confidence;
      transaction.needsReview = confidence < 60;
      await transaction.save();
      console.log('Transaction updated after reprocessing');
    }

    const response = {
      success: !processingError,
      message: processingError ? 'Reprocessing failed' : 'Receipt reprocessed successfully',
      data: { 
        extractedData,
        updatedTransaction: transaction,
        processingInfo: {
          confidence,
          status: recommendations.status,
          recommendations: recommendations.recommendations,
          improved: transaction ? confidence > (transaction.processingConfidence || 0) : false
        }
      }
    };

    if (processingError) {
      response.error = processingError.message;
    }

    res.status(processingError ? 422 : 200).json(response);

  } catch (error) {
    console.error('Reprocess receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reprocess receipt',
      error: 'REPROCESSING_FAILED'
    });
  }
});

// Enhanced OCR processing endpoint
router.post('/:filename/process-ocr', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found',
        error: 'FILE_NOT_FOUND'
      });
    }

    // Determine file type
    const extension = path.extname(filename).toLowerCase();
    const mimeType = extension === '.pdf' ? 'application/pdf' : 'image/jpeg';

    console.log(`Processing OCR for: ${filename}`);

    // Process receipt with OCR
    let extractedData;
    let processingError = null;
    
    try {
      extractedData = await processReceipt(filePath, mimeType);
    } catch (ocrError) {
      console.error('OCR processing failed:', ocrError.message);
      processingError = ocrError;
      extractedData = {
        amount: null,
        category: 'Others',
        description: 'Manual entry required',
        confidence: 0
      };
    }

    const confidence = extractedData.confidence || 0;
    const recommendations = getProcessingRecommendations(extractedData, confidence);

    const response = {
      success: !processingError,
      message: processingError ? 'OCR processing failed' : 'OCR processing completed successfully',
      data: { 
        extractedData,
        processingInfo: {
          confidence,
          status: recommendations.status,
          recommendations: recommendations.recommendations
        }
      }
    };

    if (processingError) {
      response.error = processingError.message;
      response.errorType = processingError.message.includes('blurry') ? 'IMAGE_QUALITY' : 'OCR_FAILED';
    }

    res.status(processingError ? 422 : 200).json(response);

  } catch (error) {
    console.error('Process OCR error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process OCR',
      error: 'OCR_PROCESSING_FAILED'
    });
  }
});

// New endpoint: Get image quality assessment
router.get('/:filename/quality', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found',
        error: 'FILE_NOT_FOUND'
      });
    }

    // Only assess quality for images, not PDFs
    const extension = path.extname(filename).toLowerCase();
    if (extension === '.pdf') {
      return res.json({
        success: true,
        message: 'Quality assessment not available for PDF files',
        data: {
          fileType: 'pdf',
          qualityAssessment: 'not_applicable'
        }
      });
    }

    // Assess image quality
    const qualityInfo = await assessImageQuality(filePath);
    
    let qualityRating = 'good';
    const recommendations = [];
    
    if (qualityInfo.isLowResolution) {
      qualityRating = 'poor';
      recommendations.push('Image resolution is low. Try taking a photo closer to the receipt.');
    }
    
    if (qualityInfo.contrast < 30) {
      qualityRating = 'poor';
      recommendations.push('Image has low contrast. Ensure good lighting when taking the photo.');
    } else if (qualityInfo.contrast < 50) {
      qualityRating = qualityRating === 'good' ? 'fair' : qualityRating;
      recommendations.push('Image contrast could be improved with better lighting.');
    }

    res.json({
      success: true,
      data: {
        qualityInfo,
        qualityRating,
        recommendations,
        needsPreprocessing: qualityInfo.needsPreprocessing
      }
    });

  } catch (error) {
    console.error('Quality assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assess image quality',
      error: 'QUALITY_ASSESSMENT_FAILED'
    });
  }
});

module.exports = router;
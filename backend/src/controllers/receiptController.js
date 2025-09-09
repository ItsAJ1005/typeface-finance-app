const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { v4: uuidv4 } = require("uuid");
const ocrService = require("../services/ocrService");
const Transaction = require("../models/Transaction");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = "uploads/receipts";
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept images and PDFs
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(
      new Error("Only image files (JPEG, JPG, PNG) and PDF files are allowed")
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter,
});

// Upload and process receipt
const uploadReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Add this at the beginning of uploadReceipt function
    const MAX_RECEIPTS_PER_USER = 2;

    // Check receipt limit and implement LRU deletion
    const existingReceipts = await Transaction.find({
      userId: req.userId,
      isFromReceipt: true,
    }).sort({ lastAccessed: 1 }); // Sort by lastAccessed, oldest first

    // If user has reached the limit, delete the oldest receipt
    if (existingReceipts.length >= MAX_RECEIPTS_PER_USER) {
      const oldestReceipt = existingReceipts[0]; // First one is the oldest
      
      try {
        // Delete the oldest receipt from database
        await Transaction.findByIdAndDelete(oldestReceipt._id);
        
        // Also delete the associated file if it exists
        if (oldestReceipt.receiptUrl) {
          const filePath = path.join(__dirname, '../../', oldestReceipt.receiptUrl);
          try {
            await fs.unlink(filePath);
          } catch (fileError) {
            console.warn('Could not delete old receipt file:', fileError.message);
          }
        }
        
        console.log(`Deleted oldest receipt ${oldestReceipt._id} to make room for new upload`);
      } catch (deleteError) {
        console.error('Error deleting oldest receipt:', deleteError);
        // Continue with upload even if deletion fails
      }
    }

    const filePath = req.file.path;
    const fileUrl = `/uploads/receipts/${req.file.filename}`;

    // Process the receipt using OCR
    try {
      const ocrResult = await ocrService.processReceipt(filePath);
      
      // Check if there were any extraction warnings
      const hasWarnings = ocrResult.extractionInfo?.extractionWarnings?.length > 0;
      const receiptId = uuidv4();
      
      // Prepare the base response data
      const responseData = {
        receiptId,
        receiptUrl: fileUrl,
        extractedData: {
          ...ocrResult,
          receiptUrl: fileUrl,
          type: "expense",
          isFromReceipt: true,
        },
        confidence: ocrResult.confidence,
        suggestions: {
          amount: ocrResult.amount || 0,
          category: ocrResult.category,
          description: ocrResult.description,
          date: ocrResult.date || new Date(),
        },
      };
      
      // If we have warnings, add them to the response
      if (hasWarnings) {
        console.log('Receipt processed with warnings:', ocrResult.extractionInfo.extractionWarnings);
        responseData.processingWarnings = ocrResult.extractionInfo.extractionWarnings;
        
        return res.status(200).json({
          success: true,
          message: "Receipt uploaded with processing warnings",
          data: responseData,
          _isProcessingWarning: true, // Flag to indicate this is a warning, not an error
        });
      }
      
      // If we got here, processing was fully successful
      return res.json({
        success: true,
        message: "Receipt processed successfully",
        data: responseData,
      });
    } catch (error) {
      console.error('Error processing receipt:', error);
      
      // Clean up the uploaded file
      await ocrService.cleanupFile(filePath);
      
      // Return a more specific error message
      return res.status(422).json({
        success: false,
        message: 'Receipt uploaded but processing failed',
        data: {
          receiptUrl: fileUrl,
          receiptId: uuidv4(),
        },
        processingError: error.message || 'Could not process receipt',
      });
    }
  } catch (error) {
    console.error("Receipt upload error:", error);

    // Clean up file if it exists
    if (req.file) {
      await ocrService.cleanupFile(req.file.path);
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size is 10MB.",
        });
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to upload and process receipt",
    });
  }
};

// Create transaction from processed receipt
const createTransactionFromReceipt = async (req, res) => {
  try {
    const { receiptId, amount, category, description, date, receiptUrl } =
      req.body;

    if (!receiptId || !amount || !category) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: receiptId, amount, and category are required",
      });
    }

    // Create transaction
    const transaction = new Transaction({
      userId: req.userId,
      type: "expense",
      amount: parseFloat(amount),
      category,
      description: description || "",
      date: date ? new Date(date) : new Date(),
      receiptId,
      receiptUrl,
      isFromReceipt: true,
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      message: "Transaction created from receipt successfully",
      data: { transaction },
    });
  } catch (error) {
    console.error("Create transaction from receipt error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create transaction from receipt",
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
      userId: req.userId,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found",
      });
    }

    // Update lastAccessed for LRU
    transaction.lastAccessed = Date.now();
    await transaction.save();

    res.json({
      success: true,
      data: {
        receiptId,
        receiptUrl: transaction.receiptUrl,
        transaction,
      },
    });
  } catch (error) {
    console.error("Get receipt error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve receipt",
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
      userId: req.userId,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found",
      });
    }

    // Clean up the physical file
    if (transaction.receiptUrl) {
      const filePath = path.join(process.cwd(), transaction.receiptUrl);
      await ocrService.cleanupFile(filePath);
    }

    res.json({
      success: true,
      message: "Receipt and associated transaction deleted successfully",
    });
  } catch (error) {
    console.error("Delete receipt error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete receipt",
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
      userId: req.userId,
    });

    if (!transaction || !transaction.receiptUrl) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found",
      });
    }

    const filePath = path.join(process.cwd(), transaction.receiptUrl);

    // Reprocess the receipt
    const ocrResult = await ocrService.processReceipt(filePath);

    if (!ocrResult.success) {
      return res.status(400).json({
        success: false,
        message: ocrResult.error || "Failed to reprocess receipt",
      });
    }

    res.json({
      success: true,
      message: "Receipt reprocessed successfully",
      data: {
        receiptId,
        originalTransaction: transaction,
        newSuggestions: {
          amount: ocrResult.data.amount,
          category: ocrResult.data.category,
          description: ocrResult.data.description,
          date: ocrResult.data.date,
        },
        confidence: ocrResult.data.confidence,
      },
    });
  } catch (error) {
    console.error("Reprocess receipt error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reprocess receipt",
    });
  }
};

module.exports = {
  upload,
  uploadReceipt,
  createTransactionFromReceipt,
  getReceipt,
  deleteReceipt,
  reprocessReceipt,
};

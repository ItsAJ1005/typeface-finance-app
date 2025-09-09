import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import { receiptAPI } from '../services/api';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';

// const getErrorMessage = (error) => {
//   if (error?.message?.includes('No text could be extracted')) {
//     return `The receipt image is too blurry or unclear. Please try:

// • Taking the photo in better lighting
// • Holding the camera steady and parallel to the receipt
// • Making sure the receipt is flat and not crumpled
// • Capturing the entire receipt clearly in frame
// • Ensuring there is good contrast between text and background`;
//   }
  
//   if (error?.response?.status === 413) {
//     return 'File size is too large. Please upload a smaller file (max 10MB).';
//   }

//   if (error?.message?.includes('validation failed')) {
//     return 'Invalid receipt data. Please check the receipt details and try again.';
//   }

//   return error?.message || 'Failed to process receipt. Please try again.';
// };

const Receipts = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [processingReceipt, setProcessingReceipt] = useState(null);

  // File upload state
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  
  // Success message state
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const response = await receiptAPI.getAll();
      setReceipts(response.data.receipts || []);
    } catch (error) {
      setError(error.message || 'Failed to fetch receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid file (JPEG, PNG, or PDF)');
      return;
    }

    // Validate file size (10MB limit to match backend)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError('');

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('receipt', selectedFile);

      const response = await receiptAPI.upload(formData);
      
      // Reset form
      setSelectedFile(null);
      setFilePreview(null);
      
      // Refresh receipts list
      await fetchReceipts();
      
      // Show success message with helpful information
      setError('');  // Clear any previous errors
      
      // Determine message type based on response
      const isProcessingWarning = response._isProcessingWarning || response.success === false;
      const hasProcessingError = response.data?.processingError;
      const hasWarnings = response.data?.processingWarnings?.length > 0;
      
      let messageClass, iconClass, title, message, autoClose = true;
      
      if (hasProcessingError) {
        // Processing failed but upload succeeded
        messageClass = 'bg-yellow-50 border-yellow-200 text-yellow-700';
        iconClass = 'text-yellow-400';
        title = 'Receipt uploaded with processing issues';
        message = `Your receipt has been uploaded but there were issues processing it: ${hasProcessingError}. You can review and process it manually.`;
        autoClose = false; // Keep this message open longer
      } else if (hasWarnings) {
        // Processing had warnings but was partially successful
        messageClass = 'bg-blue-50 border-blue-200 text-blue-700';
        iconClass = 'text-blue-400';
        title = 'Receipt uploaded with partial processing';
        message = (
          <div>
            <p className="font-medium">We found your receipt, but some information couldn't be extracted automatically.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {response.data.processingWarnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
            <p className="mt-2">Please review and complete the information manually.</p>
          </div>
        );
        autoClose = false; // Keep this message open longer
      } else if (isProcessingWarning) {
        // Generic processing warning
        messageClass = 'bg-yellow-50 border-yellow-200 text-yellow-700';
        iconClass = 'text-yellow-400';
        title = 'Receipt uploaded with processing issues';
        message = 'Your receipt has been uploaded but there were some issues with OCR processing. You can review and process it manually.';
      } else {
        // Success
        messageClass = 'bg-green-50 border-green-200 text-green-700';
        iconClass = 'text-green-400';
        title = 'Receipt uploaded successfully!';
        message = 'Your receipt has been uploaded and processed successfully.';
      }
      
      // Show success message using React state
      setSuccessMessage({
        class: messageClass,
        iconClass: iconClass,
        title: title,
        message: message
      });
      
      // Clear the success message after an appropriate duration
      const messageTimeout = autoClose ? 6000 : 15000; // 6s for success, 15s for warnings/errors
      const timeoutId = setTimeout(() => {
        setSuccessMessage(null);
      }, messageTimeout);
      
      // Return the timeout ID so it can be cleared if needed
      return () => clearTimeout(timeoutId);
      
    } catch (error) {
      console.log('Receipt upload error caught:', error);
      console.log('Error details:', {
        message: error.message,
        status: error.status,
        details: error.details,
        response: error.response?.data
      });
      
      // Check if this is a processing warning (handled by API interceptor)
      if (error._isProcessingWarning || error.success === false) {
        // This was handled by the API interceptor as a success with warnings
        // The success message should already be shown above
        return;
      }
      
      let errorMessage = 'Failed to upload receipt';
      
      // Handle specific OCR errors
      if (error.message?.includes('No text could be extracted')) {
        errorMessage = 'The receipt image is too blurry or unclear. Please upload a clearer image with better lighting and focus.';
      } else if (error.message?.includes('validation failed')) {
        errorMessage = 'Invalid receipt data. Please check the receipt details and try again.';
      } else if (error.processingError) {
        errorMessage = `OCR processing failed: ${error.processingError}. Please try with a clearer image.`;
      } else if (error.response?.status === 413) {
        errorMessage = 'Receipt file is too large. Please upload a smaller file (max 10MB).';
      } else if (error.status === 0) {
        errorMessage = 'Network error. Please check your connection and ensure the backend server is running.';
      } else if (error.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again later or contact support.';
      } else if (error.message) {
        // Use the specific error message from the backend
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (receipt) => {
    try {
      setSelectedReceipt(receipt);
      setShowPreviewModal(true);
      
      // Fetch extracted data if available
      if (receipt.extractedData) {
        setExtractedData(receipt.extractedData);
      } else {
        setExtractedData(null);
      }
    } catch (error) {
      setError(error.message || 'Failed to load receipt details');
    }
  };

  const handleProcessOCR = async (receiptId) => {
    try {
      setProcessingReceipt(receiptId);
      setError('');

      const response = await receiptAPI.processOCR(receiptId);
      setExtractedData(response.data.extractedData);
      
      // Update the receipt in the list
      setReceipts(prev => prev.map(r => 
        r._id === receiptId 
          ? { ...r, extractedData: response.data.extractedData }
          : r
      ));

    } catch (error) {
      setError(error.message || 'Failed to process OCR');
    } finally {
      setProcessingReceipt(null);
    }
  };

  const handleCreateTransaction = async (extractedData) => {
    try {
      // Close the current modal
      setShowPreviewModal(false);
      
      // Create the transaction object from extracted data
      const transactionData = {
        amount: extractedData.amount,
        merchant: extractedData.merchant,
        date: extractedData.date,
        description: extractedData.items?.join(', ') || '',
        type: 'expense', // Default type
        category: 'uncategorized', // Default category
        receiptId: selectedReceipt._id // Link to the receipt
      };

      // Create notification container if it doesn't exist
      let notificationContainer = document.querySelector('#notification-container');
      if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'fixed top-4 right-4 z-50 space-y-4 max-w-md';
        document.body.appendChild(notificationContainer);
      }

      // Show processing notification
      const notificationDiv = document.createElement('div');
      notificationDiv.className = 'bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 opacity-0';
      notificationDiv.innerHTML = `
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3 flex-1">
            <h3 class="text-sm font-medium text-green-800">Creating Transaction</h3>
            <div class="mt-2 text-sm text-green-700">
              <p>Creating transaction for ₹${extractedData.amount} at ${extractedData.merchant}...</p>
            </div>
          </div>
        </div>
      `;
      // Auto-hide after 6 seconds
      setTimeout(() => {
        // notificationDiv.innerHTML = '';
        notificationDiv.style.display = 'none';
      }, 6000);
      
      // Add the notification and animate it
      notificationContainer.appendChild(notificationDiv);
      setTimeout(() => {
        notificationDiv.classList.add('opacity-100');
        notificationDiv.classList.add('translate-y-0');
      }, 100);

      // Navigate to transactions page with the data
      // navigate(`/transactions/new?${new URLSearchParams(transactionData).toString()}`);

      navigate('/transactions', {
        state: { 
          transactionData,
          showCreateModal: true 
        }
      });
      
    } catch (error) {
      setError(error.message || 'Failed to create transaction');
    }
  };

  const handleDeleteReceipt = async (receiptId) => {
    if (window.confirm('Are you sure you want to delete this receipt?')) {
      try {
        await receiptAPI.delete(receiptId);
        await fetchReceipts();
      } catch (error) {
        setError(error.message || 'Failed to delete receipt');
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Loader size="lg" text="Loading receipts..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Receipts</h1>
          <p className="text-gray-600">
            Upload receipts and automatically create transactions with OCR technology
          </p>
        </div>

                 {/* Error Message */}
         {error && (
           <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
             <div className="flex items-start">
               <div className="flex-shrink-0">
                 <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                 </svg>
               </div>
               <div className="ml-3">
                 <h3 className="text-sm font-medium text-red-800">Error uploading receipt</h3>
                 <div className="mt-2 text-sm text-red-700 whitespace-pre-line">
                   {error}
                 </div>
               </div>
             </div>
           </div>
         )}

         {/* Success Message */}
         {successMessage && (
           <div className={`mb-6 ${successMessage.class} px-4 py-3 rounded relative`}>
             <div className="flex items-start">
               <div className="flex-shrink-0">
                 <svg className={`h-5 w-5 ${successMessage.iconClass}`} viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                 </svg>
               </div>
               <div className="ml-3">
                 <h3 className="text-sm font-medium">{successMessage.title}</h3>
                 <div className="mt-2 text-sm">
                   {successMessage.message}
                 </div>
               </div>
             </div>
           </div>
         )}

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Receipt</h3>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragActive ? 'border-red-400 bg-red-50' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {!selectedFile ? (
              <div>
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📄</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Drop your receipt here
                </h3>
                <p className="text-gray-600 mb-4">
                  or click to browse files
                </p>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-medium cursor-pointer"
                >
                  Choose File
                </label>
                                 <p className="text-xs text-gray-500 mt-2">
                   Supported formats: JPEG, PNG, PDF
                 </p>
              </div>
            ) : (
              <div>
                {filePreview ? (
                  <div className="mb-4">
                    <img 
                      src={filePreview} 
                      alt="Preview" 
                      className="max-w-xs mx-auto rounded border"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📄</span>
                  </div>
                )}
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {selectedFile.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  Size: {formatFileSize(selectedFile.size)}
                </p>
                <div className="flex space-x-3 justify-center">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-medium disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload Receipt'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreview(null);
                    }}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Receipts List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Uploaded Receipts ({receipts.length})
            </h2>
          </div>

          {receipts.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📄</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No receipts uploaded</h3>
              <p className="text-gray-600 mb-4">
                Upload your first receipt to automatically extract transaction details
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {receipts.map((receipt) => (
                <div key={receipt._id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-xl">
                          {receipt.filename.endsWith('.pdf') ? '📄' : '🖼️'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {receipt.filename}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Uploaded: {formatDate(receipt.uploadDate)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Size: {formatFileSize(receipt.fileSize)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          {receipt.extractedData ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✅ Ready to use
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              ⏳ Processing needed
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePreview(receipt)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          {receipt.extractedData ? 'Create Transaction' : 'View & Process'}
                        </button>
                        {!receipt.extractedData && (
                          <button
                            onClick={() => handleProcessOCR(receipt._id)}
                            disabled={processingReceipt === receipt._id}
                            className="text-green-600 hover:text-green-700 text-sm font-medium disabled:opacity-50"
                          >
                            {processingReceipt === receipt._id ? 'Processing...' : 'Extract Data'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteReceipt(receipt._id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Receipt Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setSelectedReceipt(null);
          setExtractedData(null);
        }}
        title="Receipt Details & Transaction Creation"
      >
        {selectedReceipt && (
          <div className="space-y-6">
            {/* Receipt Image/File */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Receipt File</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-lg">
                      {selectedReceipt.filename.endsWith('.pdf') ? '📄' : '🖼️'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedReceipt.filename}</p>
                    <p className="text-sm text-gray-600">
                      Size: {formatFileSize(selectedReceipt.fileSize)} | 
                      Uploaded: {formatDate(selectedReceipt.uploadDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* OCR Processing Section */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Data Extraction Status</h4>
              {!selectedReceipt.extractedData ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-yellow-600">⚠️</span>
                    <span className="text-sm font-medium text-yellow-800">Data Not Extracted</span>
                  </div>
                  <p className="text-sm text-yellow-700 mb-3">
                    Extract transaction details from this receipt to create a transaction automatically.
                  </p>
                  <button
                    onClick={() => handleProcessOCR(selectedReceipt._id)}
                    disabled={processingReceipt === selectedReceipt._id}
                    className="bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {processingReceipt === selectedReceipt._id ? 'Extracting Data...' : 'Extract Transaction Data'}
                  </button>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-sm font-medium text-green-800">Data Extracted Successfully</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Transaction details have been extracted and are ready to use.
                  </p>
                </div>
              )}
            </div>

            {/* Extracted Data */}
            {extractedData && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Extracted Transaction Details</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {extractedData.amount && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Amount:</span>
                      <span className="text-sm text-gray-900 font-semibold">
                        ₹{extractedData.amount}
                      </span>
                    </div>
                  )}
                  {extractedData.merchant && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Merchant:</span>
                      <span className="text-sm text-gray-900">{extractedData.merchant}</span>
                    </div>
                  )}
                  {extractedData.date && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Date:</span>
                      <span className="text-sm text-gray-900">{extractedData.date}</span>
                    </div>
                  )}
                  {extractedData.items && extractedData.items.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Items:</span>
                      <ul className="mt-1 space-y-1">
                        {extractedData.items.map((item, index) => (
                          <li key={index} className="text-sm text-gray-900 ml-4">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {extractedData.rawText && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Raw Text:</span>
                      <div className="mt-1 p-2 bg-white border rounded text-xs text-gray-600 max-h-20 overflow-y-auto">
                        {extractedData.rawText}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Create Transaction Button */}
                <div className="mt-4">
                  <button
                    onClick={() => handleCreateTransaction(extractedData)}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-medium flex items-center justify-center space-x-2"
                  >
                    <span>💳</span>
                    <span>Create Transaction from Receipt</span>
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    This will take you to the transaction form with pre-filled details
                  </p>
                </div>
              </div>
            )}

            {/* Help Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">💡 How Receipt Processing Works</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Upload receipt images (JPEG, PNG) or PDF files (max 10MB)</li>
                <li>• OCR technology automatically extracts transaction details</li>
                <li>• Review extracted information and create transactions instantly</li>
                <li>• All receipt data is linked to your transactions for record keeping</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Receipts;
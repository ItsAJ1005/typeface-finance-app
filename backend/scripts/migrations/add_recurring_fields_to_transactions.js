require('dotenv').config();
const mongoose = require('mongoose');

async function runMigration() {
  try {
    // Get MongoDB connection string from command line argument or environment variable
    const mongoUri = process.argv[2] || process.env.MONGODB_URI || 'mongodb://localhost:27017/finance-app';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Get the Transaction model
    const Transaction = require('../../src/models/Transaction');
    
    // Get the current collection name
    const collectionName = Transaction.collection.collectionName;
    
    // Check if the fields already exist
    const collectionInfo = await Transaction.collection.listIndexes().toArray();
    const hasIsFromRecurringIndex = collectionInfo.some(
      idx => idx.key && idx.key.isFromRecurring !== undefined
    );
    
    const hasRecurringTransactionIdIndex = collectionInfo.some(
      idx => idx.key && idx.key.recurringTransactionId !== undefined
    );
    
    if (hasIsFromRecurringIndex && hasRecurringTransactionIdIndex) {
      console.log('Migration already completed. Fields already exist in the collection.');
      process.exit(0);
    }
    
    console.log('Adding new fields to transactions collection...');
    
    // Add the new fields to all documents in the collection
    const result = await Transaction.updateMany(
      { 
        $or: [
          { isFromRecurring: { $exists: false } },
          { recurringTransactionId: { $exists: false } }
        ]
      },
      {
        $set: {
          isFromRecurring: false,
          recurringTransactionId: null
        }
      }
    );
    
    console.log('Migration completed successfully:');
    console.log(`- Documents matched: ${result.matchedCount}`);
    console.log(`- Documents modified: ${result.modifiedCount}`);
    
    // Create indexes for better query performance
    console.log('Creating indexes for better performance...');
    await Transaction.collection.createIndex({ isFromRecurring: 1 });
    await Transaction.collection.createIndex({ recurringTransactionId: 1 });
    
    console.log('Indexes created successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

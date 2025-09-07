const mongoose = require('mongoose');
const config = require('./backend/src/config/config');
const RecurringTransaction = require('./backend/src/models/RecurringTransaction');

async function checkRecurringTransactions() {
  try {
    await mongoose.connect(config.mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    const transactions = await RecurringTransaction.find({});
    console.log(`Found ${transactions.length} recurring transactions:`);
    console.log(JSON.stringify(transactions, null, 2));
    
    // Check for active recurring transactions
    const activeTransactions = await RecurringTransaction.find({ isActive: true });
    console.log(`\nFound ${activeTransactions.length} ACTIVE recurring transactions:`);
    console.log(JSON.stringify(activeTransactions, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRecurringTransactions();

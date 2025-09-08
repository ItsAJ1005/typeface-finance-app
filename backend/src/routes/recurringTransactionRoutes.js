const express = require('express');
const recurringTransactionController = require('../controllers/recurringTransactionController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Routes for managing recurring transactions
router
  .route('/')
  .post(recurringTransactionController.createRecurringTransaction)
  .get(recurringTransactionController.getAllRecurringTransactions);

router
  .route('/:id')
  .get(recurringTransactionController.getRecurringTransaction)
  .patch(recurringTransactionController.updateRecurringTransaction)
  .delete(recurringTransactionController.deleteRecurringTransaction);

// Toggle active status
router.patch(
  '/:id/toggle-active',
  recurringTransactionController.toggleActiveStatus
);

// Admin route to manually trigger processing of recurring transactions
router.post(
  '/process-recurring',
  authController.restrictTo('admin'),
  async (req, res, next) => {
    try {
      const result = await recurringTransactionController.processRecurringTransactions();
      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

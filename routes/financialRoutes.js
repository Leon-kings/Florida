const express = require('express');
const router = express.Router();
const {
  createRecordFromOrder,
  getFinancialRecords,
  getFinancialStats,
  createExpense,
  createPurchase
} = require('../controllers/financialControllers');
const { protect } = require('../middleware/auth');

// router.use(protect);

router.get('/records', getFinancialRecords);
router.get('/stats/dashboard', getFinancialStats);
router.post('/records/from-order/:orderId', createRecordFromOrder);
router.post('/expenses', createExpense);
router.post('/purchases', createPurchase);

module.exports = router;
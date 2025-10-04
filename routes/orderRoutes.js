const express = require('express');
const router = express.Router();
const {
  getInventory,
  getInventoryByProduct,
  simpleStockIn,
  simpleStockOut,
  quickStockAdjust,
  bulkStockIn,
  getDailyMovements,
  getLowStockAlerts,
  getInventoryStats,
  processOrder
} = require('../controllers/inventoryControllers');
const { protect } = require('../middleware/auth');

// router.use(protect);

router.get('/', getInventory);
router.get('/alerts/low-stock', getLowStockAlerts);
router.get('/stats/overview', getInventoryStats);
router.get('/movements/daily', getDailyMovements);
router.get('/product/:productId', getInventoryByProduct);
router.post('/stock-in', simpleStockIn);
router.post('/stock-out', simpleStockOut);
router.post('/quick-adjust', quickStockAdjust);
router.post('/bulk-stock-in', bulkStockIn);
router.post('/process-order/:orderId', processOrder);

module.exports = router;
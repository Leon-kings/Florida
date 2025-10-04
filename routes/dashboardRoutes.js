const express = require('express');
const router = express.Router();
const {
  getTodayDashboard,
  getMonthlyStats,
  getProfitLoss,
  getStockReport,
  getDashboardOverview
} = require('../controllers/dashboardControllers');
const { protect } = require('../middleware/auth');

// router.use(protect);

router.get('/today', getTodayDashboard);
router.get('/monthly', getMonthlyStats);
router.get('/profit-loss', getProfitLoss);
router.get('/stock-report', getStockReport);
router.get('/overview', getDashboardOverview);

module.exports = router;
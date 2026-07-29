const express = require('express');
const router = express.Router();
const {
  getBusinessProfile,
  updateBusinessProfile,
  getLiveQueue,
  addToken,
  callNextToken,
  updateTokenStatus,
  getDashboardMetrics,
  postponeToken
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/business', getBusinessProfile);
router.put('/business', updateBusinessProfile);
router.get('/tokens', getLiveQueue);
router.post('/tokens/add', addToken);
router.post('/tokens/call', callNextToken);
router.put('/tokens/:id/status', updateTokenStatus);
router.put('/tokens/:id/postpone', postponeToken);
router.get('/metrics', getDashboardMetrics);

module.exports = router;

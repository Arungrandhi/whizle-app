const express = require('express');
const router = express.Router();
const {
  getBusinessProfile,
  updateBusinessProfile,
  generateQRCode,
  updateQRCode,
  removeQRCode,
  getAdminTokens,
  getAdminMetrics,
  addWalkInToken,
  updateTokenStatus,
  postponeToken
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Business Profile & QR
router.get('/business', getBusinessProfile);
router.put('/business', updateBusinessProfile);
router.post('/business/qr/generate', generateQRCode);
router.put('/business/qr', updateQRCode);
router.delete('/business/qr', removeQRCode);

// Tokens & Live Queue Management
router.get('/tokens', getAdminTokens);
router.get('/metrics', getAdminMetrics);
router.post('/tokens/add', addWalkInToken);
router.put('/tokens/:id/status', updateTokenStatus);
router.put('/tokens/:id/postpone', postponeToken);

module.exports = router;


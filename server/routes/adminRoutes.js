const express = require('express');
const router = express.Router();
const {
  getBusinessProfile,
  updateBusinessProfile,
  generateQRCode,
  updateQRCode,
  removeQRCode
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/business', getBusinessProfile);
router.put('/business', updateBusinessProfile);
router.post('/business/qr/generate', generateQRCode);
router.put('/business/qr', updateQRCode);
router.delete('/business/qr', removeQRCode);

module.exports = router;


const express = require('express');
const router = express.Router();
const { verifyQRCode } = require('../controllers/adminController');

// @route   GET /api/public/qr/verify/:code
// @desc    Verify QR Code scanned by mobile app customer
// @access  Public
router.get('/qr/verify/:code', verifyQRCode);

module.exports = router;

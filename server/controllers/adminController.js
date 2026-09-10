const crypto = require('crypto');
const Business = require('../models/Business');
const QRCode = require('qrcode');
const { uploadToCloudinary } = require('../config/cloudinary');

// Helper to generate a collision-resistant unique code: WHZ-QR-XXXX-XXXX
const generateUniqueCode = () => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `WHZ-QR-${code.slice(0, 4)}-${code.slice(4)}`;
};

// @desc    Get Business Profile of Logged-in Admin
// @route   GET /api/admin/business
// @access  Private (Admin only)
const getBusinessProfile = async (req, res) => {
  try {
    const business = await Business.findById(req.user.businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business profile not found' });
    }
    res.json({ success: true, business });
  } catch (error) {
    console.error('Get business error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update Business Profile
// @route   PUT /api/admin/business
// @access  Private (Admin only)
const updateBusinessProfile = async (req, res) => {
  try {
    const business = await Business.findById(req.user.businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business profile not found' });
    }

    const {
      name,
      category,
      phone,
      address,
      country,
      state,
      city,
      zipCode,
      logo,
      backgroundImage,
      primaryColor,
      website,
      qrCode,
      queueConfig
    } = req.body;

    if (name) business.name = name;
    if (category) business.category = category;
    if (phone) business.phone = phone;
    if (address) business.address = address;
    if (country) business.country = country;
    if (state) business.state = state;
    if (city) business.city = city;
    if (zipCode) business.zipCode = zipCode;
    if (website !== undefined) business.website = website;
    if (qrCode !== undefined) business.qrCode = qrCode;
    if (logo) {
      business.logo = await uploadToCloudinary(logo, 'logos');
    }
    if (backgroundImage) {
      business.backgroundImage = await uploadToCloudinary(backgroundImage, 'backgrounds');
    }
    if (primaryColor) business.primaryColor = primaryColor;
    if (queueConfig) {
      if (queueConfig.name) business.queueConfig.name = queueConfig.name;
      if (queueConfig.startTime) business.queueConfig.startTime = queueConfig.startTime;
      if (queueConfig.endTime) business.queueConfig.endTime = queueConfig.endTime;
      if (queueConfig.serviceTime) business.queueConfig.serviceTime = Number(queueConfig.serviceTime);
    }

    await business.save();

    const io = req.app.get('io');
    if (io) {
      io.to(business._id.toString()).emit('businessUpdated', { business });
      io.to('superadmin').emit('businessesUpdated');
    }

    res.json({ success: true, message: 'Business updated successfully', business });
  } catch (error) {
    console.error('Update business error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Generate a Unique QR Code for the Business & Save to Collection
// @route   POST /api/admin/business/qr/generate
// @access  Private (Admin only)
const generateQRCode = async (req, res) => {
  try {
    const business = await Business.findById(req.user.businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business profile not found' });
    }

    // Generate unique alphanumeric code
    const uniqueCode = generateUniqueCode();

    // QR Payload: mobile deep link and structured payload
    const qrPayload = JSON.stringify({
      uniqueCode,
      businessId: business._id.toString(),
      name: business.name,
      category: business.category,
      scanUrl: `https://whistleapp.com/scan/${uniqueCode}`,
      app: 'WhistleApp'
    });

    // Generate high-resolution QR code data URL
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      width: 600,
      color: {
        dark: business.primaryColor || '#000000',
        light: '#FFFFFF'
      }
    });

    // Optionally upload to Cloudinary or save data URL directly
    let qrCodeUrl = qrDataUrl;
    try {
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
        qrCodeUrl = await uploadToCloudinary(qrDataUrl, 'qrcodes', 'image');
      }
    } catch (uploadErr) {
      console.warn('Cloudinary upload skipped, saving data URL:', uploadErr.message);
      qrCodeUrl = qrDataUrl;
    }

    business.qrCode = qrCodeUrl;
    business.uniqueQrCode = uniqueCode;
    business.qrGeneratedAt = new Date();
    await business.save();

    const io = req.app.get('io');
    if (io) {
      io.to(business._id.toString()).emit('businessUpdated', { business });
    }

    res.json({
      success: true,
      message: 'Unique QR Code generated and saved successfully',
      qrCode: qrCodeUrl,
      uniqueQrCode: uniqueCode,
      qrGeneratedAt: business.qrGeneratedAt,
      business
    });
  } catch (error) {
    console.error('Generate QR Code error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error generating QR Code' });
  }
};

// @desc    Update / Upload Custom QR Code for the Business
// @route   PUT /api/admin/business/qr
// @access  Private (Admin only)
const updateQRCode = async (req, res) => {
  try {
    const { qrCode } = req.body;
    if (!qrCode) {
      return res.status(400).json({ success: false, message: 'QR Code data or image is required' });
    }

    const business = await Business.findById(req.user.businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business profile not found' });
    }

    let finalQrUrl = qrCode;
    // Upload if base64 provided
    if (qrCode.startsWith('data:image/')) {
      try {
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
          finalQrUrl = await uploadToCloudinary(qrCode, 'qrcodes', 'image');
        }
      } catch (uploadErr) {
        console.warn('Cloudinary upload fallback to data URL:', uploadErr.message);
        finalQrUrl = qrCode;
      }
    }

    // Assign unique code if not yet assigned
    if (!business.uniqueQrCode) {
      business.uniqueQrCode = generateUniqueCode();
    }

    business.qrCode = finalQrUrl;
    business.qrGeneratedAt = new Date();
    await business.save();

    const io = req.app.get('io');
    if (io) {
      io.to(business._id.toString()).emit('businessUpdated', { business });
    }

    res.json({
      success: true,
      message: 'QR Code updated successfully',
      qrCode: finalQrUrl,
      uniqueQrCode: business.uniqueQrCode,
      qrGeneratedAt: business.qrGeneratedAt,
      business
    });
  } catch (error) {
    console.error('Update QR Code error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error updating QR Code' });
  }
};

// @desc    Remove / Delete QR Code from the Business Collection
// @route   DELETE /api/admin/business/qr
// @access  Private (Admin only)
const removeQRCode = async (req, res) => {
  try {
    const business = await Business.findById(req.user.businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business profile not found' });
    }

    business.qrCode = '';
    business.uniqueQrCode = undefined;
    business.qrGeneratedAt = undefined;
    await business.save();

    const io = req.app.get('io');
    if (io) {
      io.to(business._id.toString()).emit('businessUpdated', { business });
    }

    res.json({
      success: true,
      message: 'QR Code removed successfully',
      business
    });
  } catch (error) {
    console.error('Remove QR Code error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error removing QR Code' });
  }
};

// @desc    Verify Scanned Unique QR Code from Mobile App
// @route   GET /api/public/qr/verify/:code
// @access  Public
const verifyQRCode = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ success: false, message: 'QR Code identifier is required' });
    }

    const business = await Business.findOne({ uniqueQrCode: code });
    if (!business) {
      return res.status(404).json({ success: false, message: 'Invalid, expired, or unassigned QR Code' });
    }

    res.json({
      success: true,
      message: 'QR Code verified successfully',
      business: {
        _id: business._id,
        name: business.name,
        category: business.category,
        phone: business.phone,
        address: business.address,
        city: business.city,
        state: business.state,
        logo: business.logo,
        primaryColor: business.primaryColor,
        queueConfig: business.queueConfig,
        uniqueQrCode: business.uniqueQrCode,
        qrGeneratedAt: business.qrGeneratedAt
      }
    });
  } catch (error) {
    console.error('Verify QR Code error:', error);
    res.status(500).json({ success: false, message: 'Server error verifying QR code' });
  }
};

module.exports = {
  getBusinessProfile,
  updateBusinessProfile,
  generateQRCode,
  updateQRCode,
  removeQRCode,
  verifyQRCode
};

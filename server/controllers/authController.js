const User = require('../models/User');
const Business = require('../models/Business');
const jwt = require('jsonwebtoken');
const { uploadToCloudinary } = require('../config/cloudinary');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'whistlez_super_secret_jwt_key_2026', {
    expiresIn: '30d'
  });
};

// @desc    Register a new Admin & Business (Multi-step Signup Submission)
// @route   POST /api/auth/register
// @access  Public
const registerAdmin = async (req, res) => {
  try {
    const {
      domain,
      businessName,
      businessCategory,
      businessPhone,
      businessEmail,
      address,
      country,
      state,
      city,
      zipCode,
      queueName,
      startTime,
      endTime,
      serviceTime,
      logo,
      backgroundImage,
      primaryColor,
      adminName,
      adminEmail,
      password
    } = req.value || req.body; // supports validation helper or direct body

    // Check if user already exists
    const userExists = await User.findOne({ email: adminEmail });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Admin email already registered' });
    }

    // Check if business email is already registered
    const businessExists = await Business.findOne({ email: businessEmail });
    if (businessExists) {
      return res.status(400).json({ success: false, message: 'Business email already registered' });
    }

    // Upload logo and background to Cloudinary if they are base64 strings
    let logoUrl = '';
    let backgroundUrl = '';
    if (logo) {
      logoUrl = await uploadToCloudinary(logo, 'logos');
    }
    if (backgroundImage) {
      backgroundUrl = await uploadToCloudinary(backgroundImage, 'backgrounds');
    }

    // Create Business Profile
    const business = await Business.create({
      domain,
      name: businessName,
      category: businessCategory,
      phone: businessPhone,
      email: businessEmail,
      address,
      country,
      state,
      city,
      zipCode,
      logo: logoUrl,
      backgroundImage: backgroundUrl,
      primaryColor,
      queueConfig: {
        name: queueName,
        startTime,
        endTime,
        serviceTime: Number(serviceTime) || 15
      }
    });

    // Create User linked to the Business
    const user = await User.create({
      name: adminName,
      email: adminEmail,
      password,
      role: 'admin',
      businessId: business._id
    });

    const io = req.app.get('io');
    if (io) {
      io.to('superadmin').emit('usersUpdated');
      io.to('superadmin').emit('businessesUpdated');
      io.to('superadmin').emit('metricsUpdated');
    }

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during registration' });
  }
};

// @desc    Auth User & get Token (Admin or Super Admin Login)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Check for user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password match
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// @desc    Get Current User Profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('businessId');
    res.json({ success: true, user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching user profile' });
  }
};

module.exports = {
  registerAdmin,
  login,
  getMe
};

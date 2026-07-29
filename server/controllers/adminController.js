const Business = require('../models/Business');
const Token = require('../models/Token');

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
    if (logo) business.logo = logo;
    if (backgroundImage) business.backgroundImage = backgroundImage;
    if (primaryColor) business.primaryColor = primaryColor;
    if (queueConfig) {
      if (queueConfig.name) business.queueConfig.name = queueConfig.name;
      if (queueConfig.startTime) business.queueConfig.startTime = queueConfig.startTime;
      if (queueConfig.endTime) business.queueConfig.endTime = queueConfig.endTime;
      if (queueConfig.serviceTime) business.queueConfig.serviceTime = Number(queueConfig.serviceTime);
    }

    await business.save();
    res.json({ success: true, message: 'Business updated successfully', business });
  } catch (error) {
    console.error('Update business error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Get Live Queue Tokens with date filters support
// @route   GET /api/admin/tokens
// @access  Private (Admin only)
const getLiveQueue = async (req, res) => {
  try {
    const { date, startDate, endDate, all } = req.query;
    let query = { businessId: req.user.businessId };

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    } else if (all !== 'true') {
      // Default behavior: Fetch only today's tokens for active LiveQueue board
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: startOfToday };
    }

    const tokens = await Token.find(query).sort({ tokenNumber: 1 });
    res.json({ success: true, tokens });
  } catch (error) {
    console.error('Get tokens error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching tokens' });
  }
};

// @desc    Add a Token to Queue (Manual Walk-in Customer)
// @route   POST /api/admin/tokens/add
// @access  Private (Admin only)
const addToken = async (req, res) => {
  try {
    const { customerName, customerPhone } = req.body;
    if (!customerName || !customerPhone) {
      return res.status(400).json({ success: false, message: 'Please provide customer name and phone number' });
    }

    const businessId = req.user.businessId;

    // Check count for today to generate sequential tokenNumber
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const count = await Token.countDocuments({
      businessId,
      createdAt: { $gte: startOfToday }
    });

    const tokenNumber = count + 1;

    const token = await Token.create({
      businessId,
      tokenNumber,
      customerName,
      customerPhone,
      status: 'waiting'
    });

    // Real-time socket broadcast
    const io = req.app.get('io');
    if (io) {
      io.to(businessId.toString()).emit('tokenUpdated', { action: 'create', token });
      io.to('superadmin').emit('metricsUpdated');
    }

    res.status(201).json({ success: true, token });
  } catch (error) {
    console.error('Add token error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error adding token' });
  }
};

// @desc    Call Next Token in Queue
// @route   POST /api/admin/tokens/call
// @access  Private (Admin only)
const callNextToken = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Mark any active 'serving' tokens as 'completed'
    await Token.updateMany(
      { businessId, status: 'serving', createdAt: { $gte: startOfToday } },
      { status: 'completed', completedAt: new Date() }
    );

    // Find the oldest 'waiting' token today
    const nextToken = await Token.findOne({
      businessId,
      status: 'waiting',
      createdAt: { $gte: startOfToday }
    }).sort({ tokenNumber: 1 });

    const io = req.app.get('io');

    if (!nextToken) {
      if (io) {
        io.to(businessId.toString()).emit('tokenUpdated', { action: 'completeAll' });
        io.to('superadmin').emit('metricsUpdated');
      }
      return res.json({ success: true, message: 'No waiting tokens in the queue', token: null });
    }

    nextToken.status = 'serving';
    nextToken.calledAt = new Date();
    await nextToken.save();

    // Broadcast called token
    if (io) {
      io.to(businessId.toString()).emit('tokenUpdated', { action: 'call', token: nextToken });
      io.to('superadmin').emit('metricsUpdated');
    }

    res.json({ success: true, token: nextToken });
  } catch (error) {
    console.error('Call next error:', error);
    res.status(500).json({ success: false, message: 'Server error calling next token' });
  }
};

// @desc    Update Status of a specific Token (serving, completed, skipped)
// @route   PUT /api/admin/tokens/:id/status
// @access  Private (Admin only)
const updateTokenStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const tokenId = req.params.id;

    if (!['waiting', 'serving', 'completed', 'skipped'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const token = await Token.findOne({ _id: tokenId, businessId: req.user.businessId });
    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found or unauthorized' });
    }

    token.status = status;
    if (status === 'serving') {
      token.calledAt = new Date();
    } else if (status === 'completed' || status === 'skipped') {
      token.completedAt = new Date();
    }

    await token.save();

    // Broadcast status change
    const io = req.app.get('io');
    if (io) {
      io.to(token.businessId.toString()).emit('tokenUpdated', { action: 'status', token });
      io.to('superadmin').emit('metricsUpdated');
    }

    res.json({ success: true, token });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: 'Server error updating status' });
  }
};

// @desc    Get Dashboard Metrics for Admin
// @route   GET /api/admin/metrics
// @access  Private (Admin only)
const getDashboardMetrics = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    
    // Support date query filtering
    const { date } = req.query;
    let queryDateStart = new Date();
    queryDateStart.setHours(0, 0, 0, 0);
    let queryDateEnd = new Date();
    queryDateEnd.setHours(23, 59, 59, 999);

    if (date) {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        queryDateStart = new Date(parsed);
        queryDateStart.setHours(0, 0, 0, 0);
        queryDateEnd = new Date(parsed);
        queryDateEnd.setHours(23, 59, 59, 999);
      }
    }

    const tokensToday = await Token.find({
      businessId,
      createdAt: { $gte: queryDateStart, $lte: queryDateEnd }
    });

    const total = tokensToday.length;
    const waiting = tokensToday.filter(t => t.status === 'waiting').length;
    const serving = tokensToday.filter(t => t.status === 'serving').length;
    const completed = tokensToday.filter(t => t.status === 'completed').length;
    const skipped = tokensToday.filter(t => t.status === 'skipped').length;

    // Calculate Average Wait Time
    const servedTokens = tokensToday.filter(t => t.status === 'completed' || t.status === 'serving');
    let totalWaitTimeMs = 0;
    let waitCount = 0;

    servedTokens.forEach(t => {
      if (t.calledAt) {
        totalWaitTimeMs += (new Date(t.calledAt) - new Date(t.createdAt));
        waitCount++;
      }
    });

    const avgWaitTimeMinutes = waitCount > 0 ? Math.round((totalWaitTimeMs / waitCount) / 60000) : 0;

    // Get Business Info
    const business = await Business.findById(businessId);

    res.json({
      success: true,
      metrics: {
        totalTokens: total,
        waiting,
        serving,
        completed,
        skipped,
        avgWaitTimeMinutes,
        businessName: business ? business.name : ''
      }
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ success: false, message: 'Server error generating metrics' });
  }
};

// @desc    Postpone Token to Another Day
// @route   PUT /api/admin/tokens/:id/postpone
// @access  Private (Admin only)
const postponeToken = async (req, res) => {
  try {
    const { postponedDate } = req.body;
    const tokenId = req.params.id;

    if (!postponedDate) {
      return res.status(400).json({ success: false, message: 'Please specify a date to postpone' });
    }

    const token = await Token.findOne({ _id: tokenId, businessId: req.user.businessId });
    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found or unauthorized' });
    }

    // Mark the original token as 'postponed' today
    token.status = 'postponed';
    token.completedAt = new Date();
    await token.save();

    // Count existing tokens on target day to compute new sequential tokenNumber
    const targetStart = new Date(postponedDate);
    targetStart.setHours(0, 0, 0, 0);
    const targetEnd = new Date(postponedDate);
    targetEnd.setHours(23, 59, 59, 999);

    const count = await Token.countDocuments({
      businessId: req.user.businessId,
      createdAt: { $gte: targetStart, $lte: targetEnd }
    });

    const targetDateObject = new Date(postponedDate + 'T12:00:00'); // set mid-day to prevent TZ shifts

    // Create a new waiting clone token for target date
    const postponedToken = await Token.create({
      businessId: token.businessId,
      tokenNumber: count + 1,
      customerName: token.customerName,
      customerPhone: token.customerPhone,
      status: 'waiting',
      createdAt: targetDateObject
    });

    // Socket notification
    const io = req.app.get('io');
    if (io) {
      io.to(token.businessId.toString()).emit('tokenUpdated', { action: 'postpone', originalToken: token, newToken: postponedToken });
      io.to('superadmin').emit('metricsUpdated');
    }

    res.json({ success: true, message: `Token postponed to ${postponedDate}`, token: postponedToken });
  } catch (error) {
    console.error('Postpone token error:', error);
    res.status(500).json({ success: false, message: 'Server error postponing token' });
  }
};

module.exports = {
  getBusinessProfile,
  updateBusinessProfile,
  getLiveQueue,
  addToken,
  callNextToken,
  updateTokenStatus,
  getDashboardMetrics,
  postponeToken
};

const Business = require('../models/Business');
const User = require('../models/User');
const Token = require('../models/Token');
const Ringtone = require('../models/Ringtone');
const Ad = require('../models/Ad');
const { uploadToCloudinary } = require('../config/cloudinary');

// @desc    Get All Registered Businesses & Admins
// @route   GET /api/superadmin/businesses
// @access  Private (Super Admin only)
const getBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find().sort({ createdAt: -1 });
    
    const businessesWithAdmins = await Promise.all(
      businesses.map(async (biz) => {
        const adminUser = await User.findOne({ businessId: biz._id, role: 'admin' }).select('-password');
        const totalTokens = await Token.countDocuments({ businessId: biz._id });
        
        return {
          ...biz.toObject(),
          admin: adminUser ? { name: adminUser.name, email: adminUser.email } : null,
          totalTokens
        };
      })
    );

    res.json({ success: true, businesses: businessesWithAdmins });
  } catch (error) {
    console.error('Superadmin get businesses error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get Single Business Profile Details & Analytics
// @route   GET /api/superadmin/businesses/:id
// @access  Private (Super Admin only)
const getBusinessDetail = async (req, res) => {
  try {
    const businessId = req.params.id;
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const adminUser = await User.findOne({ businessId, role: 'admin' }).select('-password');
    
    // Aggregated token stats
    const totalTokens = await Token.countDocuments({ businessId });
    const waitingTokens = await Token.countDocuments({ businessId, status: 'waiting' });
    const servingTokens = await Token.countDocuments({ businessId, status: 'serving' });
    const completedTokens = await Token.countDocuments({ businessId, status: 'completed' });
    const skippedTokens = await Token.countDocuments({ businessId, status: 'skipped' });
    const cancelledTokens = await Token.countDocuments({ businessId, status: 'cancelled' });

    // Fetch all tokens for this business in the last 1 year to build analytics
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const tokens = await Token.find({
      businessId,
      createdAt: { $gte: oneYearAgo }
    }).select('createdAt');

    const today = new Date();
    
    // 0. Daily (9 AM to 6 PM today)
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const dailyData = [
      { label: '9 AM', count: 0 },
      { label: '10 AM', count: 0 },
      { label: '11 AM', count: 0 },
      { label: '12 PM', count: 0 },
      { label: '1 PM', count: 0 },
      { label: '2 PM', count: 0 },
      { label: '3 PM', count: 0 },
      { label: '4 PM', count: 0 },
      { label: '5 PM', count: 0 },
      { label: '6 PM', count: 0 }
    ];

    // 1. Weekly (Mon to Sun of current week)
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklyData = [
      { label: 'Mon', count: 0 },
      { label: 'Tue', count: 0 },
      { label: 'Wed', count: 0 },
      { label: 'Thu', count: 0 },
      { label: 'Fri', count: 0 },
      { label: 'Sat', count: 0 },
      { label: 'Sun', count: 0 }
    ];

    // 2. Monthly (Week 1 to Week 5 of current month)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyData = [
      { label: 'Week 1', count: 0 },
      { label: 'Week 2', count: 0 },
      { label: 'Week 3', count: 0 },
      { label: 'Week 4', count: 0 },
      { label: 'Week 5', count: 0 }
    ];

    // 3. Yearly (Jan to Dec of current year)
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const yearlyData = months.map(m => ({ label: m, count: 0 }));

    tokens.forEach(token => {
      const tDate = new Date(token.createdAt);
      
      // Daily
      if (tDate >= startOfDay) {
        const hour = tDate.getHours();
        if (hour >= 9 && hour <= 18) {
          dailyData[hour - 9].count++;
        }
      }

      // Weekly
      if (tDate >= startOfWeek) {
        const day = tDate.getDay();
        const index = day === 0 ? 6 : day - 1;
        if (index >= 0 && index < 7) {
          weeklyData[index].count++;
        }
      }

      // Monthly
      if (tDate >= startOfMonth) {
        const date = tDate.getDate();
        const weekIndex = Math.min(4, Math.floor((date - 1) / 7));
        if (weekIndex >= 0 && weekIndex < 5) {
          monthlyData[weekIndex].count++;
        }
      }

      // Yearly
      if (tDate >= startOfYear) {
        const monthIndex = tDate.getMonth();
        if (monthIndex >= 0 && monthIndex < 12) {
          yearlyData[monthIndex].count++;
        }
      }
    });

    res.json({
      success: true,
      business,
      admin: adminUser,
      stats: {
        totalTokens,
        waitingTokens,
        servingTokens,
        completedTokens,
        skippedTokens: skippedTokens + cancelledTokens,
        analytics: {
          daily: dailyData,
          weekly: weeklyData,
          monthly: monthlyData,
          yearly: yearlyData
        }
      }
    });
  } catch (error) {
    console.error('Get business detail error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete Business and linked Admin User and Tokens
// @route   DELETE /api/superadmin/businesses/:id
// @access  Private (Super Admin only)
const deleteBusiness = async (req, res) => {
  try {
    const businessId = req.params.id;
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    await User.deleteMany({ businessId });
    await Token.deleteMany({ businessId });
    await Business.findByIdAndDelete(businessId);

    // Socket notify
    const io = req.app.get('io');
    if (io) {
      io.to('superadmin').emit('businessesUpdated');
      io.to('superadmin').emit('usersUpdated');
      io.to('superadmin').emit('metricsUpdated');
    }

    res.json({ success: true, message: 'Business and all associated account data deleted successfully' });
  } catch (error) {
    console.error('Delete business error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get All Registered User Accounts
// @route   GET /api/superadmin/users
// @access  Private (Super Admin only)
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('businessId').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    console.error('Get users list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get Global System Metrics
// @route   GET /api/superadmin/metrics
// @access  Private (Super Admin only)
const getGlobalMetrics = async (req, res) => {
  try {
    const totalBusinesses = await Business.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalTokens = await Token.countDocuments();
    const totalWaitingTokens = await Token.countDocuments({ status: 'waiting' });
    const totalServedTokens = await Token.countDocuments({ status: 'completed' });
    const totalAds = await Ad.countDocuments({ isActive: true });

    res.json({
      success: true,
      metrics: {
        totalBusinesses,
        totalAdmins,
        totalTokens,
        totalWaitingTokens,
        totalServedTokens,
        totalAds
      }
    });
  } catch (error) {
    console.error('Global metrics error:', error);
    res.status(500).json({ success: false, message: 'Server error generating metrics' });
  }
};

// --- RINGTONES ACTIONS ---

const getRingtones = async (req, res) => {
  try {
    let ringtones = await Ringtone.find().sort({ createdAt: -1 });
    
    // Self-healing database check: ensure exactly one active ringtone exists
    const activeRingtones = ringtones.filter(r => r.isActive);
    if (activeRingtones.length > 1) {
      const defaultRingtone = ringtones.find(r => r.isDefault);
      const ringtoneToKeepActive = defaultRingtone || activeRingtones[0];
      
      await Ringtone.updateMany({ _id: { $ne: ringtoneToKeepActive._id } }, { isActive: false });
      await Ringtone.updateOne({ _id: ringtoneToKeepActive._id }, { isActive: true });
      
      ringtones = await Ringtone.find().sort({ createdAt: -1 });
    } else if (activeRingtones.length === 0 && ringtones.length > 0) {
      const defaultRingtone = ringtones.find(r => r.isDefault) || ringtones[0];
      await Ringtone.updateOne({ _id: defaultRingtone._id }, { isActive: true, isDefault: true });
      ringtones = await Ringtone.find().sort({ createdAt: -1 });
    }
    
    res.json({ success: true, ringtones });
  } catch (error) {
    console.error('Get ringtones error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createRingtone = async (req, res) => {
  try {
    const { name, file, duration, isDefault } = req.body;
    if (!name || !file) {
      return res.status(400).json({ success: false, message: 'Ringtone name and audio file are required' });
    }

    const count = await Ringtone.countDocuments();
    const shouldBeDefault = isDefault || count === 0;

    if (shouldBeDefault) {
      await Ringtone.updateMany({}, { isDefault: false, isActive: false });
    }

    // Upload ringtone file to Cloudinary (resource_type: video is required for audio)
    const fileUrl = await uploadToCloudinary(file, 'ringtones', 'video');

    const ringtone = await Ringtone.create({
      name,
      file: fileUrl,
      duration: duration || '0:15 sec',
      isDefault: shouldBeDefault,
      isActive: shouldBeDefault // Only active if it's default
    });

    const io = req.app.get('io');
    if (io) {
      io.to('superadmin').emit('ringtonesUpdated');
    }

    res.status(201).json({ success: true, ringtone });
  } catch (error) {
    console.error('Create ringtone error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const setDefaultRingtone = async (req, res) => {
  try {
    const ringtoneId = req.params.id;
    const ringtone = await Ringtone.findById(ringtoneId);
    if (!ringtone) return res.status(404).json({ success: false, message: 'Ringtone not found' });

    // Set all others to false
    await Ringtone.updateMany({}, { isDefault: false, isActive: false });

    // Set this one to true and active
    ringtone.isDefault = true;
    ringtone.isActive = true;
    await ringtone.save();

    const io = req.app.get('io');
    if (io) {
      io.to('superadmin').emit('ringtonesUpdated');
    }

    res.json({ success: true, ringtone });
  } catch (error) {
    console.error('Set default ringtone error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateRingtone = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Ringtone name is required' });
    }
    const ringtone = await Ringtone.findByIdAndUpdate(req.params.id, { name }, { new: true });
    if (!ringtone) return res.status(404).json({ success: false, message: 'Ringtone not found' });

    const io = req.app.get('io');
    if (io) {
      io.to('superadmin').emit('ringtonesUpdated');
    }

    res.json({ success: true, ringtone });
  } catch (error) {
    console.error('Update ringtone error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const toggleRingtone = async (req, res) => {
  try {
    const ringtone = await Ringtone.findById(req.params.id);
    if (!ringtone) return res.status(404).json({ success: false, message: 'Ringtone not found' });

    if (ringtone.isActive) {
      // Trying to deactivate
      if (ringtone.isDefault) {
        return res.status(400).json({ success: false, message: 'Default ringtone must remain active' });
      }
      ringtone.isActive = false;
      await ringtone.save();
      // Revert active status to default ringtone
      await Ringtone.updateOne({ isDefault: true }, { isActive: true });
    } else {
      // Trying to activate
      // Deactivate all others
      await Ringtone.updateMany({}, { isActive: false });
      ringtone.isActive = true;
      await ringtone.save();
    }

    const io = req.app.get('io');
    if (io) {
      io.to('superadmin').emit('ringtonesUpdated');
    }

    res.json({ success: true, ringtone });
  } catch (error) {
    console.error('Toggle ringtone error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteRingtone = async (req, res) => {
  try {
    const ringtone = await Ringtone.findById(req.params.id);
    if (!ringtone) return res.status(404).json({ success: false, message: 'Ringtone not found' });

    if (ringtone.isDefault) {
      return res.status(400).json({ success: false, message: 'Cannot delete the default system ringtone' });
    }

    const wasActive = ringtone.isActive;
    await Ringtone.findByIdAndDelete(req.params.id);

    if (wasActive) {
      // Make default ringtone active
      await Ringtone.updateOne({ isDefault: true }, { isActive: true });
    }

    const io = req.app.get('io');
    if (io) {
      io.to('superadmin').emit('ringtonesUpdated');
    }

    res.json({ success: true, message: 'Ringtone deleted successfully' });
  } catch (error) {
    console.error('Delete ringtone error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// --- ADS ACTIONS ---

const getAds = async (req, res) => {
  try {
    const ads = await Ad.find().sort({ createdAt: -1 });
    const normalizedAds = ads.map(ad => {
      const adObj = ad.toObject();
      adObj.positions = adObj.positions && adObj.positions.length 
        ? adObj.positions 
        : (adObj.position ? [adObj.position] : []);
      return adObj;
    });
    res.json({ success: true, ads: normalizedAds });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createAd = async (req, res) => {
  try {
    const { name, positions, file, url, targeting } = req.body;
    const finalPositions = positions && positions.length ? positions : (req.body.position ? [req.body.position] : []);

    if (!name || !file || !url) {
      return res.status(400).json({ success: false, message: 'Campaign specifications are required' });
    }
    if (finalPositions.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one ad placement must be selected' });
    }

    // Backend targeting validation and normalization
    let validatedTargeting = { type: 'GLOBAL', locations: [] };
    if (targeting) {
      if (!['GLOBAL', 'REGIONAL'].includes(targeting.type)) {
        return res.status(400).json({ success: false, message: 'Invalid targeting type' });
      }
      validatedTargeting.type = targeting.type;

      if (targeting.type === 'REGIONAL') {
        if (!Array.isArray(targeting.locations) || targeting.locations.length === 0) {
          return res.status(400).json({ success: false, message: 'Regional targeting requires at least one location' });
        }

        const normalizedLocations = [];
        for (const loc of targeting.locations) {
          if (!loc.countryCode || !loc.countryName || !loc.targetingLevel) {
            return res.status(400).json({ success: false, message: 'Locations require countryCode, countryName, and targetingLevel' });
          }
          if (!['COUNTRY', 'STATE', 'CITY'].includes(loc.targetingLevel)) {
            return res.status(400).json({ success: false, message: 'Invalid location targeting level' });
          }
          if (['STATE', 'CITY'].includes(loc.targetingLevel) && (!loc.stateCode || !loc.stateName)) {
            return res.status(400).json({ success: false, message: 'State-level targets require stateCode and stateName' });
          }
          if (loc.targetingLevel === 'CITY' && !loc.cityName) {
            return res.status(400).json({ success: false, message: 'City-level targets require cityName' });
          }

          const cleanLoc = {
            countryCode: loc.countryCode.toUpperCase().trim(),
            countryName: loc.countryName.trim(),
            targetingLevel: loc.targetingLevel
          };

          if (['STATE', 'CITY'].includes(loc.targetingLevel)) {
            cleanLoc.stateCode = loc.stateCode.toUpperCase().trim();
            cleanLoc.stateName = loc.stateName.trim();
          }
          if (loc.targetingLevel === 'CITY') {
            cleanLoc.cityName = loc.cityName.trim();
          }

          normalizedLocations.push(cleanLoc);
        }

        // Deduplicate and filter logical redundancies
        const finalLocations = [];
        for (const newLoc of normalizedLocations) {
          let isCovered = false;
          for (const loc of finalLocations) {
            if (loc.targetingLevel === 'COUNTRY' && loc.countryCode === newLoc.countryCode) {
              isCovered = true;
              break;
            }
            if (loc.targetingLevel === 'STATE' && 
                loc.countryCode === newLoc.countryCode && 
                loc.stateCode === newLoc.stateCode) {
              isCovered = true;
              break;
            }
            if (loc.countryCode === newLoc.countryCode && 
                loc.stateCode === newLoc.stateCode && 
                loc.cityName === newLoc.cityName) {
              isCovered = true;
              break;
            }
          }

          if (isCovered) continue;

          let filtered = [...finalLocations];
          if (newLoc.targetingLevel === 'COUNTRY') {
            filtered = filtered.filter(l => l.countryCode !== newLoc.countryCode);
          } else if (newLoc.targetingLevel === 'STATE') {
            filtered = filtered.filter(l => !(l.countryCode === newLoc.countryCode && l.stateCode === newLoc.stateCode));
          }

          filtered.push(newLoc);
          finalLocations.length = 0;
          finalLocations.push(...filtered);
        }

        validatedTargeting.locations = finalLocations;
      }
    }
    
    // Inject mock statistics views & clicks for rich visualization
    const views = Math.floor(Math.random() * 15000) + 1200;
    const clicks = Math.floor(views * (Math.random() * 0.08 + 0.01)); // 1% to 9% CTR

    // Upload ad file to Cloudinary
    const fileUrl = await uploadToCloudinary(file, 'ads');

    const ad = await Ad.create({
      name,
      positions: finalPositions,
      position: finalPositions[0] || 'Home Page 1',
      file: fileUrl,
      url,
      views,
      clicks,
      targeting: validatedTargeting
    });

    const io = req.app.get('io');
    if (io) {
      io.to('superadmin').emit('adsUpdated');
      io.to('superadmin').emit('metricsUpdated');
    }

    res.status(201).json({ success: true, ad });
  } catch (error) {
    console.error('Error creating ad campaign:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateAd = async (req, res) => {
  try {
    const { name, positions, file, url, targeting } = req.body;
    const ad = await Ad.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad campaign not found' });
    }

    if (name) ad.name = name;
    if (positions) {
      ad.positions = positions;
      ad.position = positions[0] || 'Home Page 1';
    } else if (req.body.position) {
      ad.position = req.body.position;
      ad.positions = [req.body.position];
    }
    if (file) {
      ad.file = await uploadToCloudinary(file, 'ads');
    }
    if (url) ad.url = url;

    // Validate and update targeting if provided
    if (targeting) {
      if (!['GLOBAL', 'REGIONAL'].includes(targeting.type)) {
        return res.status(400).json({ success: false, message: 'Invalid targeting type' });
      }
      
      let validatedTargeting = { type: targeting.type, locations: [] };
      if (targeting.type === 'REGIONAL') {
        if (!Array.isArray(targeting.locations) || targeting.locations.length === 0) {
          return res.status(400).json({ success: false, message: 'Regional targeting requires at least one location' });
        }

        const normalizedLocations = [];
        for (const loc of targeting.locations) {
          if (!loc.countryCode || !loc.countryName || !loc.targetingLevel) {
            return res.status(400).json({ success: false, message: 'Locations require countryCode, countryName, and targetingLevel' });
          }
          if (!['COUNTRY', 'STATE', 'CITY'].includes(loc.targetingLevel)) {
            return res.status(400).json({ success: false, message: 'Invalid location targeting level' });
          }
          if (['STATE', 'CITY'].includes(loc.targetingLevel) && (!loc.stateCode || !loc.stateName)) {
            return res.status(400).json({ success: false, message: 'State-level targets require stateCode and stateName' });
          }
          if (loc.targetingLevel === 'CITY' && !loc.cityName) {
            return res.status(400).json({ success: false, message: 'City-level targets require cityName' });
          }

          const cleanLoc = {
            countryCode: loc.countryCode.toUpperCase().trim(),
            countryName: loc.countryName.trim(),
            targetingLevel: loc.targetingLevel
          };

          if (['STATE', 'CITY'].includes(loc.targetingLevel)) {
            cleanLoc.stateCode = loc.stateCode.toUpperCase().trim();
            cleanLoc.stateName = loc.stateName.trim();
          }
          if (loc.targetingLevel === 'CITY') {
            cleanLoc.cityName = loc.cityName.trim();
          }

          normalizedLocations.push(cleanLoc);
        }

        const finalLocations = [];
        for (const newLoc of normalizedLocations) {
          let isCovered = false;
          for (const loc of finalLocations) {
            if (loc.targetingLevel === 'COUNTRY' && loc.countryCode === newLoc.countryCode) {
              isCovered = true;
              break;
            }
            if (loc.targetingLevel === 'STATE' && 
                loc.countryCode === newLoc.countryCode && 
                loc.stateCode === newLoc.stateCode) {
              isCovered = true;
              break;
            }
            if (loc.countryCode === newLoc.countryCode && 
                loc.stateCode === newLoc.stateCode && 
                loc.cityName === newLoc.cityName) {
              isCovered = true;
              break;
            }
          }

          if (isCovered) continue;

          let filtered = [...finalLocations];
          if (newLoc.targetingLevel === 'COUNTRY') {
            filtered = filtered.filter(l => l.countryCode !== newLoc.countryCode);
          } else if (newLoc.targetingLevel === 'STATE') {
            filtered = filtered.filter(l => !(l.countryCode === newLoc.countryCode && l.stateCode === newLoc.stateCode));
          }

          filtered.push(newLoc);
          finalLocations.length = 0;
          finalLocations.push(...filtered);
        }

        validatedTargeting.locations = finalLocations;
      }
      ad.targeting = validatedTargeting;
    }

    await ad.save();

    const io = req.app.get('io');
    if (io) {
      io.to('superadmin').emit('adsUpdated');
    }

    res.json({ success: true, ad });
  } catch (error) {
    console.error('Error updating ad campaign:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const toggleAd = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ success: false, message: 'Ad campaign not found' });
    ad.isActive = !ad.isActive;
    await ad.save();

    const io = req.app.get('io');
    if (io) {
      io.to('superadmin').emit('adsUpdated');
    }

    res.json({ success: true, ad });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteAd = async (req, res) => {
  try {
    await Ad.findByIdAndDelete(req.params.id);

    const io = req.app.get('io');
    if (io) {
      io.to('superadmin').emit('adsUpdated');
      io.to('superadmin').emit('metricsUpdated');
    }

    res.json({ success: true, message: 'Ad campaign deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateBusiness = async (req, res) => {
  try {
    const businessId = req.params.id;
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const {
      name,
      category,
      phone,
      address,
      website,
      maxCapacity,
      queueConfig
    } = req.body;

    if (name) business.name = name;
    if (category) business.category = category;
    if (phone) business.phone = phone;
    if (address) business.address = address;
    if (website !== undefined) business.website = website;
    if (maxCapacity !== undefined) business.maxCapacity = Number(maxCapacity);
    if (queueConfig) {
      if (!business.queueConfig) business.queueConfig = {};
      if (queueConfig.name) business.queueConfig.name = queueConfig.name;
      if (queueConfig.startTime) business.queueConfig.startTime = queueConfig.startTime;
      if (queueConfig.endTime) business.queueConfig.endTime = queueConfig.endTime;
      if (queueConfig.serviceTime !== undefined) {
        business.queueConfig.serviceTime = Number(queueConfig.serviceTime);
      }
    }

    await business.save();

    // Socket notify
    const io = req.app.get('io');
    if (io) {
      io.to('superadmin').emit('businessesUpdated');
      io.to(businessId.toString()).emit('tokenUpdated', { action: 'businessProfileUpdated' });
    }

    res.json({ success: true, message: 'Business updated successfully', business });
  } catch (error) {
    console.error('Update business error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getBusinesses,
  getBusinessDetail,
  deleteBusiness,
  updateBusiness,
  getUsers,
  getGlobalMetrics,
  
  getRingtones,
  createRingtone,
  toggleRingtone,
  deleteRingtone,
  updateRingtone,
  setDefaultRingtone,
  
  getAds,
  createAd,
  updateAd,
  toggleAd,
  deleteAd
};
const path = require('path');

const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/superAdminController');
const {
  getTrendingTopicsAdmin,
  createTrendingTopic,
  updateTrendingTopic,
  deleteTrendingTopic,
  duplicateTrendingTopic,
  bulkUpdateTopics,
  getTrendingConfig,
  updateTrendingConfig,
  regenerateTrendingFeedManual,
  lockTrendingFeed,
  getTrendingHistoryByDate,
  getTrendingHistorySummary
} = require('../controllers/trendingController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and superadmin role
router.use(protect);
router.use(authorize('superadmin'));

router.get('/businesses', getBusinesses);
router.get('/businesses/:id', getBusinessDetail);
router.put('/businesses/:id', updateBusiness);
router.delete('/businesses/:id', deleteBusiness);

router.get('/users', getUsers);
router.get('/metrics', getGlobalMetrics);

// Ringtones CRUD
router.get('/ringtones', getRingtones);
router.post('/ringtones', createRingtone);
router.put('/ringtones/:id/toggle', toggleRingtone);
router.put('/ringtones/:id', updateRingtone);
router.put('/ringtones/:id/default', setDefaultRingtone);
router.delete('/ringtones/:id', deleteRingtone);

// Ads CRUD
router.get('/ads', getAds);
router.post('/ads', createAd);
router.put('/ads/:id', updateAd);
router.put('/ads/:id/toggle', toggleAd);
router.delete('/ads/:id', deleteAd);

// Trending CRUD & Operations
router.get('/trending/topics', getTrendingTopicsAdmin);
router.post('/trending/topics', createTrendingTopic);
router.put('/trending/topics/:id', updateTrendingTopic);
router.post('/trending/topics/:id/duplicate', duplicateTrendingTopic);
router.delete('/trending/topics/:id', deleteTrendingTopic);
router.post('/trending/topics/bulk', bulkUpdateTopics);

router.get('/trending/config', getTrendingConfig);
router.put('/trending/config', updateTrendingConfig);
router.post('/trending/regenerate', regenerateTrendingFeedManual);
router.post('/trending/lock', lockTrendingFeed);
router.get('/trending/history', getTrendingHistoryByDate);
router.get('/trending/history/summary', getTrendingHistorySummary);

module.exports = router;

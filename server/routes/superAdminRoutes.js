const express = require('express');
const router = express.Router();
const {
  getBusinesses,
  getBusinessDetail,
  deleteBusiness,
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
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and superadmin role
router.use(protect);
router.use(authorize('superadmin'));

router.get('/businesses', getBusinesses);
router.get('/businesses/:id', getBusinessDetail);
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

module.exports = router;

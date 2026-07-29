const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');

const AD_PLACEMENTS = [
  { id: 'HOME_1', label: 'Home Page 1' },
  { id: 'HOME_2', label: 'Home Page 2' },
  { id: 'SIDEBAR', label: 'Sidebar Ads' },
  { id: 'FOOTER', label: 'Footer Banners' }
];

// @desc    Get Active Filtered Advertisements for Clients
// @route   GET /api/ads
// @access  Public (Used by client/mobile apps)
router.get('/', async (req, res) => {
  try {
    const { placement, countryCode, stateCode, cityName, country, state, city } = req.query;

    // Use query params fallback
    const targetCountryCode = (countryCode || country || '').toUpperCase().trim();
    const targetStateCode = (stateCode || state || '').toUpperCase().trim();
    const targetCityName = (cityName || city || '').toLowerCase().trim();

    // Fetch all active ads
    const ads = await Ad.find({ isActive: true });

    // Filter matching ads in memory
    const matchedAds = ads.map(ad => {
      const adObj = ad.toObject();
      adObj.positions = adObj.positions && adObj.positions.length 
        ? adObj.positions 
        : (adObj.position ? [adObj.position] : []);
      return adObj;
    }).filter(ad => {
      // 1. Placement matching
      if (placement) {
        const reqPlacement = placement.trim();
        const found = AD_PLACEMENTS.find(p => 
          p.id.toUpperCase() === reqPlacement.toUpperCase() || 
          p.label.toUpperCase() === reqPlacement.toUpperCase()
        );
        const searchTerms = found ? [found.id, found.label] : [reqPlacement];
        
        // Check case-insensitive against positions list
        const hasPlacement = ad.positions.some(pos => 
          searchTerms.some(term => term.toUpperCase() === pos.toUpperCase())
        );
        if (!hasPlacement) return false;
      }

      // 2. Location/Targeting matching
      if (!ad.targeting || ad.targeting.type === 'GLOBAL') {
        return true;
      }

      if (ad.targeting.type === 'REGIONAL') {
        // If regional targeting is active but no country provided, it cannot match
        if (!targetCountryCode) return false;

        return ad.targeting.locations.some(loc => {
          const locCountry = (loc.countryCode || '').toUpperCase().trim();
          const locState = (loc.stateCode || '').toUpperCase().trim();
          const locCity = (loc.cityName || '').toLowerCase().trim();

          if (loc.targetingLevel === 'COUNTRY') {
            return locCountry === targetCountryCode;
          }
          if (loc.targetingLevel === 'STATE') {
            if (!targetStateCode) return false;
            return locCountry === targetCountryCode && locState === targetStateCode;
          }
          if (loc.targetingLevel === 'CITY') {
            if (!targetStateCode || !targetCityName) return false;
            return locCountry === targetCountryCode && 
                   locState === targetStateCode && 
                   locCity === targetCityName;
          }
          return false;
        });
      }

      return false;
    });

    res.json({ success: true, ads: matchedAds });
  } catch (error) {
    console.error('Error fetching client ads:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

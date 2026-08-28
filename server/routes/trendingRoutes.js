const express = require('express');
const router = express.Router();
const { getTrendingTopics, incrementWhizle } = require('../controllers/trendingController');

// Public user-facing trending routes
router.get('/', getTrendingTopics);
router.post('/:id/whizle', incrementWhizle);

module.exports = router;

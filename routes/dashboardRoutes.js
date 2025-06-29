const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Dashboard routes
router.get('/stats', dashboardController.getDashboardStats);
router.get('/recent-rides', dashboardController.getRecentRides);
router.get('/revenue-data', dashboardController.getRevenueData);

module.exports = router; 
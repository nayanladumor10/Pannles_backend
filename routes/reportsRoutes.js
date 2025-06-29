// Location: /routes/reportsRoutes.js
// This file defines all the API routes for reports functionality

const express = require("express")
const router = express.Router()
const reportsController = require("../controllers/reportsController")

// Reports routes with real-time Socket.IO integration
router.get("/earnings", reportsController.getEarningsReport)
router.get("/driver-performance", reportsController.getDriverPerformanceReport)
router.get("/rides-analysis", reportsController.getRidesAnalysisReport)
router.get("/summary", reportsController.getReportsSummary)

module.exports = router

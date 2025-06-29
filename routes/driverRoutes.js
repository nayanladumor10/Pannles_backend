const express = require("express")
const Driverrouter = express.Router()
const {
  getAllDrivers,
  createDriver,
  deleteDriver,
  updateDriver,
  getDriverStats,
  updateDriverLocation,
  getDriver,
  resetWithIndianNames,
  bulkKycVerification,
  verifySelfieWithCamera,
} = require("../controllers/driverController")

const { getSubDrivers, addSubDriver, updateSubDriver, deleteSubDriver } = require("../controllers/subDriverController")

const upload = require("../middlewares/uploadMiddleware")

// Stats route should come BEFORE /:id route to avoid conflicts
Driverrouter.get("/stats", getDriverStats)

// Reset route for development
Driverrouter.post("/reset", resetWithIndianNames)

// Get all drivers
Driverrouter.get("/", getAllDrivers)

// Create new driver with file uploads and error handling
Driverrouter.post(
  "/add",
  (req, res, next) => {
    console.log("📝 Received driver creation request")
    console.log("Body:", req.body)
    next()
  },
  // Use upload.any() to handle dynamic field names for sub-drivers
  upload.any(),
  (error, req, res, next) => {
    if (error) {
      console.error("❌ Upload error:", error.message)
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }
    next()
  },
  createDriver,
)

// Get single driver (this should come after specific routes like /stats)
Driverrouter.get("/:id", getDriver)

// Update driver
Driverrouter.put("/edit/:id", updateDriver)

// --- New Route for Selfie Verification ---
Driverrouter.post("/verify-selfie/:id", upload.single("selfie"), verifySelfieWithCamera)

// Update driver location
Driverrouter.patch("/:id/location", updateDriverLocation)

// Delete driver
Driverrouter.delete("/delete/:id", deleteDriver)

// Update the bulk KYC route as well
Driverrouter.put(
  "/kyc/bulk",
  upload.any(),
  (error, req, res, next) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }
    next()
  },
  bulkKycVerification,
)

// Sub-driver specific routes
Driverrouter.get("/:primaryDriverId/subdrivers", getSubDrivers)
Driverrouter.post("/:primaryDriverId/subdrivers", upload.any(), addSubDriver)
Driverrouter.put("/subdrivers/:subDriverId", updateSubDriver)
Driverrouter.delete("/subdrivers/:subDriverId", deleteSubDriver)

module.exports = Driverrouter

const Driver = require("../models/TRdriverModel")
const axios = require("axios")
const FormData = require("form-data")
const fs = require("fs")
const path = require("path")

// --- Face++ API Configuration ---
const FACEPLUSPLUS_API_KEY = "ugsIgRsnHtwyhBoPCFykX5cEneQplNb2"
const FACEPLUSPLUS_API_SECRET = "AVJHolEltcTBtOYXr3VQOjC4SjgmQvzu"
const FACEPLUSPLUS_DETECT_URL = "https://api-us.faceplusplus.com/facepp/v3/detect"
const FACEPLUSPLUS_COMPARE_URL = "https://api-us.faceplusplus.com/facepp/v3/compare"
const CONFIDENCE_THRESHOLD = 80

// Helper function to call Face++ Detect API
const detectFace = async (filePath) => {
  try {
    const formData = new FormData()
    formData.append("api_key", FACEPLUSPLUS_API_KEY)
    formData.append("api_secret", FACEPLUSPLUS_API_SECRET)
    formData.append("image_file", fs.createReadStream(filePath))

    const response = await axios.post(FACEPLUSPLUS_DETECT_URL, formData, {
      headers: formData.getHeaders(),
    })

    if (response.data.faces && response.data.faces.length > 0) {
      return { success: true, faceToken: response.data.faces[0].face_token }
    } else {
      return { success: false, message: "No face detected in the uploaded selfie." }
    }
  } catch (error) {
    console.error("Face++ Detect API Error:", error.response ? error.response.data : error.message)
    const errorMessage =
      error.response && error.response.data && error.response.data.error_message
        ? error.response.data.error_message
        : "An error occurred during face detection."
    return { success: false, message: errorMessage }
  }
}

// Helper function to call Face++ Compare API
const compareFaces = async (faceToken1, faceToken2) => {
  try {
    const formData = new FormData()
    formData.append("api_key", FACEPLUSPLUS_API_KEY)
    formData.append("api_secret", FACEPLUSPLUS_API_SECRET)
    formData.append("face_token1", faceToken1)
    formData.append("face_token2", faceToken2)

    const response = await axios.post(FACEPLUSPLUS_COMPARE_URL, formData, {
      headers: formData.getHeaders(),
    })

    return { success: true, confidence: response.data.confidence, thresholds: response.data.thresholds }
  } catch (error) {
    console.error("Face++ Compare API Error:", error.response ? error.response.data : error.message)
    const errorMessage =
      error.response && error.response.data && error.response.data.error_message
        ? error.response.data.error_message
        : "An error occurred during face comparison."
    return { success: false, message: errorMessage }
  }
}

// Get all drivers with improved error handling and population
const getAllDrivers = async (req, res) => {
  try {
    const { status, search } = req.query
    const query = {}

    if (status && status !== "all") {
      query.status = status
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { vehicle: { $regex: search, $options: "i" } },
        { vehicleType: { $regex: search, $options: "i" } },
        { licensePlate: { $regex: search, $options: "i" } },
      ]
    }

    const drivers = await Driver.find(query)
      .populate("primaryDriver", "name")
      .populate("subDrivers", "name")
      .sort({ lastUpdate: -1 })

    res.json({
      success: true,
      count: drivers.length,
      data: drivers,
    })
  } catch (error) {
    console.error("Error fetching drivers:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch drivers",
      error: error.message,
    })
  }
}

// Get single driver
const getDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id).populate("subDrivers", "name email phone")

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      })
    }

    res.json({
      success: true,
      data: driver,
    })
  } catch (error) {
    console.error("Error fetching driver:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID format",
      })
    }
    res.status(500).json({
      success: false,
      message: "Failed to fetch driver",
      error: error.message,
    })
  }
}

// Create new driver with Face++ integration and enhanced sub-driver logic
const createDriver = async (req, res) => {
  try {
    const { name, email, phone, vehicleType, licensePlate, driverType, primaryDriver, subDrivers } = req.body

    // Helper function to organize uploaded files
    const organizeFiles = (files) => {
      const organized = {
        main: {},
        subDrivers: {},
      }

      files.forEach((file) => {
        if (file.fieldname.startsWith("subDriver_")) {
          const parts = file.fieldname.split("_")
          const index = parts[1]
          const docType = parts[2]

          if (!organized.subDrivers[index]) {
            organized.subDrivers[index] = {}
          }
          organized.subDrivers[index][docType] = file.path
        } else {
          organized.main[file.fieldname] = file.path
        }
      })

      return organized
    }

    const organizedFiles = organizeFiles(req.files || [])

    // --- Face++ Integration on Create ---
    const selfieFile = organizedFiles.main.selfie
    if (!selfieFile) {
      return res.status(400).json({ success: false, message: "A selfie is required for face verification." })
    }

    const detectionResult = await detectFace(selfieFile)
    if (!detectionResult.success) {
      fs.unlinkSync(selfieFile)
      return res.status(400).json({ success: false, message: detectionResult.message })
    }

    const commonDriverData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      kycStatus: "Pending",
      joinDate: new Date(),
      isOnline: true,
      status: "idle",
      lastUpdate: new Date(),
      faceToken: detectionResult.faceToken,
      selfiePhoto: selfieFile,
      location: {
        lat: 24.8607 + (Math.random() - 0.5) * 0.01,
        lng: 67.0011 + (Math.random() - 0.5) * 0.01,
      },
      driverType,
    }

    // Handle main driver file uploads
    if (organizedFiles.main.license) commonDriverData.licensePhoto = organizedFiles.main.license
    if (organizedFiles.main.pan) commonDriverData.panPhoto = organizedFiles.main.pan
    if (organizedFiles.main.vehicle) commonDriverData.vehiclePhoto = organizedFiles.main.vehicle
    if (organizedFiles.main.numberplate) commonDriverData.numberplatePhoto = organizedFiles.main.numberplate

    // Add vehicle information for both primary and sub-drivers
    if (vehicleType && licensePlate) {
      const vehicle = `${vehicleType.trim()} - ${licensePlate.trim().toUpperCase()}`
      commonDriverData.vehicle = vehicle
      commonDriverData.vehicleType = vehicleType.trim()
      commonDriverData.licensePlate = licensePlate.trim().toUpperCase()
    }

    if (driverType === "Primary") {
      const newDriver = new Driver(commonDriverData)
      const savedDriver = await newDriver.save()

      // Handle multiple sub-drivers with their documents
      if (subDrivers && typeof subDrivers === "string") {
        const subDriversArray = JSON.parse(subDrivers)
        if (Array.isArray(subDriversArray) && subDriversArray.length > 0) {
          const createdSubDrivers = []

          for (let i = 0; i < subDriversArray.length; i++) {
            const subDriverData = subDriversArray[i]

            // Handle sub-driver selfie and face detection
            const subDriverSelfie = organizedFiles.subDrivers[i]?.selfie
            let subDriverFaceToken = null

            if (subDriverSelfie) {
              const subDetectionResult = await detectFace(subDriverSelfie)
              if (subDetectionResult.success) {
                subDriverFaceToken = subDetectionResult.faceToken
              }
            }

            const subDriver = new Driver({
              name: subDriverData.name?.trim(),
              email: subDriverData.email?.trim().toLowerCase(),
              phone: subDriverData.phone?.trim(),
              vehicleType: subDriverData.vehicleType?.trim(),
              licensePlate: subDriverData.licensePlate?.trim().toUpperCase(),
              vehicle:
                subDriverData.vehicleType && subDriverData.licensePlate
                  ? `${subDriverData.vehicleType.trim()} - ${subDriverData.licensePlate.trim().toUpperCase()}`
                  : null,
              driverType: "Sub-driver",
              primaryDriver: savedDriver._id,
              kycStatus: "Pending",
              joinDate: new Date(),
              isOnline: true,
              status: "idle",
              lastUpdate: new Date(),
              faceToken: subDriverFaceToken,
              selfiePhoto: subDriverSelfie,
              licensePhoto: organizedFiles.subDrivers[i]?.license,
              panPhoto: organizedFiles.subDrivers[i]?.pan,
              vehiclePhoto: organizedFiles.subDrivers[i]?.vehicle,
              numberplatePhoto: organizedFiles.subDrivers[i]?.numberplate,
              location: {
                lat: 24.8607 + (Math.random() - 0.5) * 0.01,
                lng: 67.0011 + (Math.random() - 0.5) * 0.01,
              },
            })

            const savedSubDriver = await subDriver.save()
            createdSubDrivers.push(savedSubDriver._id)
          }

          savedDriver.subDrivers = createdSubDrivers
          await savedDriver.save()
        }
      }

      res.status(201).json({
        success: true,
        message: "Primary driver onboarded successfully.",
        data: savedDriver,
      })
    } else {
      // Sub-driver logic
      if (!primaryDriver) {
        return res.status(400).json({ success: false, message: "Primary driver ID is required for sub-drivers." })
      }
      const primary = await Driver.findById(primaryDriver)
      if (!primary) {
        return res.status(404).json({ success: false, message: "Primary driver not found." })
      }

      commonDriverData.primaryDriver = primary._id

      const newDriver = new Driver(commonDriverData)
      const savedDriver = await newDriver.save()

      primary.subDrivers.push(savedDriver._id)
      await primary.save()

      res.status(201).json({
        success: true,
        message: "Sub-driver onboarded and assigned successfully.",
        data: savedDriver,
      })
    }
  } catch (error) {
    console.error("❌ Error creating driver:", error)
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({ success: false, message: "Validation failed", errors: validationErrors })
    }
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: `Driver with this ${Object.keys(error.keyPattern)[0]} already exists.` })
    }
    res.status(500).json({ success: false, message: "Failed to create driver", error: error.message })
  }
}

// Update driver
const updateDriver = async (req, res) => {
  try {
    const updateData = { ...req.body, lastUpdate: new Date() }

    if (updateData.vehicleType || updateData.licensePlate) {
      const currentDriver = await Driver.findById(req.params.id)
      if (currentDriver) {
        const vehicleType = updateData.vehicleType || currentDriver.vehicleType
        const licensePlate = updateData.licensePlate || currentDriver.licensePlate
        if (vehicleType && licensePlate) {
          updateData.vehicle = `${vehicleType} - ${licensePlate.toUpperCase()}`
        }
      }
    }

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined || updateData[key] === "") {
        delete updateData[key]
      }
    })

    const driver = await Driver.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })

    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" })
    }

    res.json({ success: true, message: "Driver updated successfully", data: driver })
  } catch (error) {
    console.error("Error updating driver:", error)
    res.status(400).json({ success: false, message: "Failed to update driver", error: error.message })
  }
}

// Verify driver's selfie with Face++ Compare API
const verifySelfieWithCamera = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" })
    }

    if (!driver.faceToken) {
      return res.status(400).json({
        success: false,
        message: "No face token on record for this driver. Please re-onboard with a selfie.",
      })
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Verification selfie is required." })
    }

    const verificationSelfiePath = req.file.path

    // 1. Detect face in the new selfie to get a new face_token
    const detectionResult = await detectFace(verificationSelfiePath)

    if (!detectionResult.success) {
      fs.unlinkSync(verificationSelfiePath)
      return res.status(400).json({ success: false, message: `Verification failed: ${detectionResult.message}` })
    }

    const faceToken2 = detectionResult.faceToken

    // 2. Compare the original face_token with the new one
    const comparisonResult = await compareFaces(driver.faceToken, faceToken2)

    fs.unlinkSync(verificationSelfiePath)

    if (!comparisonResult.success) {
      return res.status(500).json({ success: false, message: `Face comparison API error: ${comparisonResult.message}` })
    }

    if (comparisonResult.confidence >= CONFIDENCE_THRESHOLD) {
      driver.kycStatus = "Verified"
      await driver.save()

      res.json({
        success: true,
        message: `Face verification successful (Confidence: ${comparisonResult.confidence.toFixed(2)}%). Driver KYC is now 'Verified'.`,
        data: driver,
      })
    } else {
      res.status(400).json({
        success: false,
        message: `Face verification failed. The selfies do not appear to match (Confidence: ${comparisonResult.confidence.toFixed(2)}%).`,
      })
    }
  } catch (error) {
    console.error("❌ Error during selfie verification:", error)
    res.status(500).json({
      success: false,
      message: "An internal server error occurred during selfie verification.",
      error: error.message,
    })
  }
}

const updateDriverLocation = async (req, res) => {
  try {
    const { lat, lng, speed } = req.body
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: "Valid latitude and longitude are required" })
    }
    const updateData = { location: { lat, lng }, lastUpdate: new Date() }
    if (speed) updateData.speed = speed

    const driver = await Driver.findByIdAndUpdate(req.params.id, updateData, { new: true })
    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" })
    }
    res.json({ success: true, message: "Driver location updated", data: driver })
  } catch (error) {
    res.status(400).json({ success: false, message: "Failed to update driver location", error: error.message })
  }
}

const deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id)
    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" })
    }
    // If a sub-driver is deleted, remove it from the primary driver's list
    if (driver.driverType === "Sub-driver" && driver.primaryDriver) {
      await Driver.findByIdAndUpdate(driver.primaryDriver, {
        $pull: { subDrivers: driver._id },
      })
    }

    // If a primary driver is deleted, handle sub-drivers (e.g., delete them or reassign)
    if (driver.driverType === "Primary" && driver.subDrivers.length > 0) {
      await Driver.deleteMany({ _id: { $in: driver.subDrivers } })
    }

    // Clean up all uploaded files
    const filesToDelete = [
      driver.licensePhoto,
      driver.panPhoto,
      driver.selfiePhoto,
      driver.vehiclePhoto,
      driver.numberplatePhoto,
    ].filter(Boolean)

    filesToDelete.forEach((filePath) => {
      fs.unlink(path.resolve(filePath), (err) => {
        if (err) console.error(`Error deleting file ${filePath}:`, err)
      })
    })

    res.json({ success: true, message: "Driver and associated sub-drivers deleted successfully" })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete driver", error: error.message })
  }
}

const getDriverStats = async (req, res) => {
  try {
    const stats = await Driver.aggregate([
      {
        $group: {
          _id: null,
          totalDrivers: { $sum: 1 },
          activeDrivers: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
          idleDrivers: { $sum: { $cond: [{ $eq: ["$status", "idle"] }, 1, 0] } },
          verifiedDrivers: { $sum: { $cond: [{ $eq: ["$kycStatus", "Verified"] }, 1, 0] } },
          pendingDrivers: { $sum: { $cond: [{ $eq: ["$kycStatus", "Pending"] }, 1, 0] } },
          avgRating: { $avg: "$rating" },
          totalTrips: { $sum: "$completedTrips" },
        },
      },
    ])
    res.json({ success: true, data: stats[0] || {} })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch driver stats", error: error.message })
  }
}

const resetWithIndianNames = async (req, res) => {
  try {
    await Driver.deleteMany({})
    const indianDrivers = []
    const createdDrivers = await Driver.insertMany(indianDrivers)
    res.json({ success: true, message: "Drivers reset successfully", data: createdDrivers })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to reset drivers", error: error.message })
  }
}

const bulkKycVerification = async (req, res) => {
  res.status(400).json({
    success: false,
    message: "Bulk KYC is not supported with face verification. Please verify each driver individually.",
  })
}

module.exports = {
  getAllDrivers,
  getDriver,
  createDriver,
  updateDriver,
  updateDriverLocation,
  deleteDriver,
  getDriverStats,
  resetWithIndianNames,
  bulkKycVerification,
  verifySelfieWithCamera,
}

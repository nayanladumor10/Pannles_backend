const Driver = require("../models/TRdriverModel")
const { processSubDriverFiles, validateSubDriverDocuments } = require("../utils/fileUploadHelper")

// Get all sub-drivers for a primary driver
const getSubDrivers = async (req, res) => {
  try {
    const { primaryDriverId } = req.params

    const subDrivers = await Driver.find({
      primaryDriver: primaryDriverId,
      driverType: "Sub-driver",
    }).populate("primaryDriver", "name email")

    res.json({
      success: true,
      count: subDrivers.length,
      data: subDrivers,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch sub-drivers",
      error: error.message,
    })
  }
}

// Add a new sub-driver to existing primary driver
const addSubDriver = async (req, res) => {
  try {
    const { primaryDriverId } = req.params
    const { name, email, phone, vehicleType, licensePlate } = req.body

    // Find primary driver
    const primaryDriver = await Driver.findById(primaryDriverId)
    if (!primaryDriver || primaryDriver.driverType !== "Primary") {
      return res.status(404).json({
        success: false,
        message: "Primary driver not found",
      })
    }

    // Handle file uploads
    const files = req.files || []
    const organizedFiles = {}
    files.forEach((file) => {
      organizedFiles[file.fieldname] = file.path
    })

    // Create sub-driver
    const subDriverData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      vehicleType: vehicleType?.trim(),
      licensePlate: licensePlate?.trim().toUpperCase(),
      driverType: "Sub-driver",
      primaryDriver: primaryDriverId,
      kycStatus: "Pending",
      joinDate: new Date(),
      isOnline: true,
      status: "idle",
      lastUpdate: new Date(),
      location: {
        lat: 24.8607 + (Math.random() - 0.5) * 0.01,
        lng: 67.0011 + (Math.random() - 0.5) * 0.01,
      },
    }

    // Add vehicle info if provided
    if (vehicleType && licensePlate) {
      subDriverData.vehicle = `${vehicleType.trim()} - ${licensePlate.trim().toUpperCase()}`
    }

    // Add document paths
    if (organizedFiles.license) subDriverData.licensePhoto = organizedFiles.license
    if (organizedFiles.pan) subDriverData.panPhoto = organizedFiles.pan
    if (organizedFiles.selfie) subDriverData.selfiePhoto = organizedFiles.selfie
    if (organizedFiles.vehicle) subDriverData.vehiclePhoto = organizedFiles.vehicle
    if (organizedFiles.numberplate) subDriverData.numberplatePhoto = organizedFiles.numberplate

    const newSubDriver = new Driver(subDriverData)
    const savedSubDriver = await newSubDriver.save()

    // Update primary driver's sub-drivers list
    primaryDriver.subDrivers.push(savedSubDriver._id)
    await primaryDriver.save()

    res.status(201).json({
      success: true,
      message: "Sub-driver added successfully",
      data: savedSubDriver,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add sub-driver",
      error: error.message,
    })
  }
}

// Update sub-driver
const updateSubDriver = async (req, res) => {
  try {
    const { subDriverId } = req.params
    const updateData = { ...req.body, lastUpdate: new Date() }

    // Handle vehicle info update
    if (updateData.vehicleType || updateData.licensePlate) {
      const currentSubDriver = await Driver.findById(subDriverId)
      if (currentSubDriver) {
        const vehicleType = updateData.vehicleType || currentSubDriver.vehicleType
        const licensePlate = updateData.licensePlate || currentSubDriver.licensePlate
        if (vehicleType && licensePlate) {
          updateData.vehicle = `${vehicleType} - ${licensePlate.toUpperCase()}`
        }
      }
    }

    const updatedSubDriver = await Driver.findByIdAndUpdate(subDriverId, updateData, { new: true, runValidators: true })

    if (!updatedSubDriver) {
      return res.status(404).json({
        success: false,
        message: "Sub-driver not found",
      })
    }

    res.json({
      success: true,
      message: "Sub-driver updated successfully",
      data: updatedSubDriver,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update sub-driver",
      error: error.message,
    })
  }
}

// Delete sub-driver
const deleteSubDriver = async (req, res) => {
  try {
    const { subDriverId } = req.params

    const subDriver = await Driver.findById(subDriverId)
    if (!subDriver || subDriver.driverType !== "Sub-driver") {
      return res.status(404).json({
        success: false,
        message: "Sub-driver not found",
      })
    }

    // Remove from primary driver's list
    if (subDriver.primaryDriver) {
      await Driver.findByIdAndUpdate(subDriver.primaryDriver, { $pull: { subDrivers: subDriverId } })
    }

    // Delete the sub-driver
    await Driver.findByIdAndDelete(subDriverId)

    res.json({
      success: true,
      message: "Sub-driver deleted successfully",
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete sub-driver",
      error: error.message,
    })
  }
}

module.exports = {
  getSubDrivers,
  addSubDriver,
  updateSubDriver,
  deleteSubDriver,
}

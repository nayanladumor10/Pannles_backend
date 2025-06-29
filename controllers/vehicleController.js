const Vehicle = require("../models/Vehicle")

// Helper: registration number validator
const isValidRegistrationNumber = (regNum) => {
  return /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/.test(regNum)
}

// Helper: case-insensitive value checker
const includesIgnoreCase = (value, validArray) => {
  return validArray.some((item) => item.toLowerCase() === value.toLowerCase())
}

// Add new vehicle
exports.addVehicle = async (req, res) => {
  try {
    const {
      registrationNumber,
      vehicleType,
      category,
      model,
      year,
      color,
      capacity,
      fuelType,
      status,
      kycStatus,
      assignedDriver,
      insuranceExpiryDate,
      registrationExpiryDate,
    } = req.body

    // Validation
    if (!registrationNumber || !registrationNumber.trim()) {
      return res.status(400).json({ error: "Registration number is required" })
    }

    const upperRegNum = registrationNumber.trim().toUpperCase()
    if (!isValidRegistrationNumber(upperRegNum)) {
      return res.status(400).json({ error: "Invalid registration number format. Use format: XX00XX0000" })
    }

    // Check if registration number already exists
    const existingVehicle = await Vehicle.findOne({ registrationNumber: upperRegNum })
    if (existingVehicle) {
      return res.status(400).json({ error: "Vehicle with this registration number already exists" })
    }

    const currentYear = new Date().getFullYear()
    if (!year || year < 1900 || year > currentYear + 1) {
      return res.status(400).json({ error: `Year must be between 1900 and ${currentYear + 1}` })
    }

    const validVehicleTypes = ["Car", "Bike", "Electric vehicle", "Truck", "Van"]
    if (!includesIgnoreCase(vehicleType, validVehicleTypes)) {
      return res.status(400).json({ error: "Invalid vehicleType. Valid options: " + validVehicleTypes.join(", ") })
    }

    const validCategories = ["Ride", "Courier Delivery", "Food Delivery"]
    if (!includesIgnoreCase(category, validCategories)) {
      return res.status(400).json({ error: "Invalid category. Valid options: " + validCategories.join(", ") })
    }

    const validFuelTypes = ["Petrol", "Diesel", "CNG", "Electric"]
    if (!includesIgnoreCase(fuelType, validFuelTypes)) {
      return res.status(400).json({ error: "Invalid fuelType. Valid options: " + validFuelTypes.join(", ") })
    }

    const validStatus = ["Active", "Inactive", "Maintenance"]
    if (status && !includesIgnoreCase(status, validStatus)) {
      return res.status(400).json({ error: "Invalid status. Valid options: " + validStatus.join(", ") })
    }

    const validKYC = ["Verified", "Pending", "Rejected"]
    if (kycStatus && !includesIgnoreCase(kycStatus, validKYC)) {
      return res.status(400).json({ error: "Invalid KYC Status. Valid options: " + validKYC.join(", ") })
    }

    if (!capacity || typeof capacity !== "number" || capacity < 1 || capacity > 50) {
      return res.status(400).json({ error: "Capacity must be a number between 1 and 50" })
    }

    if (!model || !model.trim()) {
      return res.status(400).json({ error: "Model is required" })
    }

    if (!color || !color.trim()) {
      return res.status(400).json({ error: "Color is required" })
    }

    const vehicleData = {
      registrationNumber: upperRegNum,
      vehicleType,
      category,
      model: model.trim(),
      year,
      color: color.trim(),
      capacity,
      fuelType,
      status: status || "Active",
      kycStatus: kycStatus || "Pending",
    }

    // Add optional fields if provided
    if (assignedDriver) vehicleData.assignedDriver = assignedDriver
    if (insuranceExpiryDate) vehicleData.insuranceExpiryDate = new Date(insuranceExpiryDate)
    if (registrationExpiryDate) vehicleData.registrationExpiryDate = new Date(registrationExpiryDate)

    const newVehicle = await Vehicle.create(vehicleData)

    res.status(201).json({
      success: true,
      message: "Vehicle added successfully",
      vehicle: newVehicle,
    })
  } catch (error) {
    console.error("Error adding vehicle:", error)
    if (error.code === 11000) {
      return res.status(400).json({ error: "Vehicle with this registration number already exists" })
    }
    res.status(500).json({ error: error.message })
  }
}

// Get all vehicles with filtering and pagination
exports.getAllVehicles = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      vehicleType,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query

    // Build filter object
    const filter = {}
    if (status) filter.status = status
    if (category) filter.category = category
    if (vehicleType) filter.vehicleType = vehicleType

    if (search) {
      filter.$or = [
        { registrationNumber: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
        { color: { $regex: search, $options: "i" } },
      ]
    }

    // Calculate pagination
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)
    const sortOptions = {}
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1

    // Execute query with pagination
    const [vehicles, total] = await Promise.all([
      Vehicle.find(filter)
        .populate("assignedDriver", "name phone")
        .sort(sortOptions)
        .skip(skip)
        .limit(Number.parseInt(limit)),
      Vehicle.countDocuments(filter),
    ])

    res.status(200).json({
      success: true,
      data: vehicles,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(total / Number.parseInt(limit)),
        totalItems: total,
        itemsPerPage: Number.parseInt(limit),
      },
    })
  } catch (error) {
    console.error("Error fetching vehicles:", error)
    res.status(500).json({ error: error.message })
  }
}

// Get vehicle by ID
exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate("assignedDriver", "name phone email")
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" })
    }
    res.status(200).json({
      success: true,
      data: vehicle,
    })
  } catch (error) {
    console.error("Error fetching vehicle:", error)
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid vehicle ID format" })
    }
    res.status(500).json({ error: error.message })
  }
}

// Update vehicle
exports.updateVehicle = async (req, res) => {
  try {
    const updateData = { ...req.body }

    // Validate registration number if provided
    if (updateData.registrationNumber) {
      const upperRegNum = updateData.registrationNumber.trim().toUpperCase()
      if (!isValidRegistrationNumber(upperRegNum)) {
        return res.status(400).json({ error: "Invalid registration number format" })
      }

      // Check if registration number already exists (excluding current vehicle)
      const existingVehicle = await Vehicle.findOne({
        registrationNumber: upperRegNum,
        _id: { $ne: req.params.id },
      })
      if (existingVehicle) {
        return res.status(400).json({ error: "Vehicle with this registration number already exists" })
      }

      updateData.registrationNumber = upperRegNum
    }

    // Validate year if provided
    if (updateData.year) {
      const currentYear = new Date().getFullYear()
      if (updateData.year < 1900 || updateData.year > currentYear + 1) {
        return res.status(400).json({ error: `Year must be between 1900 and ${currentYear + 1}` })
      }
    }

    // Validate enum fields
    const validVehicleTypes = ["Car", "Bike", "Electric vehicle", "Truck", "Van"]
    if (updateData.vehicleType && !includesIgnoreCase(updateData.vehicleType, validVehicleTypes)) {
      return res.status(400).json({ error: "Invalid vehicleType" })
    }

    const validCategories = ["Ride", "Courier Delivery", "Food Delivery"]
    if (updateData.category && !includesIgnoreCase(updateData.category, validCategories)) {
      return res.status(400).json({ error: "Invalid category" })
    }

    const validFuelTypes = ["Petrol", "Diesel", "CNG", "Electric"]
    if (updateData.fuelType && !includesIgnoreCase(updateData.fuelType, validFuelTypes)) {
      return res.status(400).json({ error: "Invalid fuelType" })
    }

    const validStatus = ["Active", "Inactive", "Maintenance"]
    if (updateData.status && !includesIgnoreCase(updateData.status, validStatus)) {
      return res.status(400).json({ error: "Invalid status" })
    }

    const validKYC = ["Verified", "Pending", "Rejected"]
    if (updateData.kycStatus && !includesIgnoreCase(updateData.kycStatus, validKYC)) {
      return res.status(400).json({ error: "Invalid KYC Status" })
    }

    // Validate capacity if provided
    if (updateData.capacity) {
      if (typeof updateData.capacity !== "number" || updateData.capacity < 1 || updateData.capacity > 50) {
        return res.status(400).json({ error: "Capacity must be a number between 1 and 50" })
      }
    }

    // Trim string fields
    if (updateData.model) updateData.model = updateData.model.trim()
    if (updateData.color) updateData.color = updateData.color.trim()

    const updatedVehicle = await Vehicle.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("assignedDriver", "name phone")

    if (!updatedVehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" })
    }

    res.status(200).json({
      success: true,
      message: "Vehicle updated successfully",
      vehicle: updatedVehicle,
    })
  } catch (error) {
    console.error("Error updating vehicle:", error)
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid vehicle ID format" })
    }
    if (error.code === 11000) {
      return res.status(400).json({ error: "Vehicle with this registration number already exists" })
    }
    res.status(500).json({ error: error.message })
  }
}

// Delete vehicle
exports.deleteVehicle = async (req, res) => {
  try {
    const deletedVehicle = await Vehicle.findByIdAndDelete(req.params.id)
    if (!deletedVehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" })
    }
    res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully",
      deletedVehicle: {
        id: deletedVehicle._id,
        registrationNumber: deletedVehicle.registrationNumber,
      },
    })
  } catch (error) {
    console.error("Error deleting vehicle:", error)
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid vehicle ID format" })
    }
    res.status(500).json({ error: error.message })
  }
}

// Get vehicle statistics
exports.getVehicleStats = async (req, res) => {
  try {
    const stats = await Vehicle.aggregate([
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          activeVehicles: {
            $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] },
          },
          inactiveVehicles: {
            $sum: { $cond: [{ $eq: ["$status", "Inactive"] }, 1, 0] },
          },
          maintenanceVehicles: {
            $sum: { $cond: [{ $eq: ["$status", "Maintenance"] }, 1, 0] },
          },
          verifiedVehicles: {
            $sum: { $cond: [{ $eq: ["$kycStatus", "Verified"] }, 1, 0] },
          },
          pendingVehicles: {
            $sum: { $cond: [{ $eq: ["$kycStatus", "Pending"] }, 1, 0] },
          },
        },
      },
    ])

    const categoryStats = await Vehicle.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ])

    const vehicleTypeStats = await Vehicle.aggregate([
      {
        $group: {
          _id: "$vehicleType",
          count: { $sum: 1 },
        },
      },
    ])

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {
          totalVehicles: 0,
          activeVehicles: 0,
          inactiveVehicles: 0,
          maintenanceVehicles: 0,
          verifiedVehicles: 0,
          pendingVehicles: 0,
        },
        categoryBreakdown: categoryStats,
        vehicleTypeBreakdown: vehicleTypeStats,
      },
    })
  } catch (error) {
    console.error("Error fetching vehicle stats:", error)
    res.status(500).json({ error: error.message })
  }
}

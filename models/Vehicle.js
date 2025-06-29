const mongoose = require("mongoose")

const VehicleSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      validate: {
        validator: (v) => /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/.test(v),
        message: "Invalid registration number format. Use format: XX00XX0000",
      },
    },
    vehicleType: {
      type: String,
      enum: ["Car", "Bike", "Electric vehicle", "Truck", "Van"],
      required: true,
    },
    category: {
      type: String,
      enum: ["Ride", "Courier Delivery", "Food Delivery"],
      required: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
      min: 1900,
      max: new Date().getFullYear() + 1,
    },
    color: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
    },
    fuelType: {
      type: String,
      enum: ["Petrol", "Diesel", "CNG", "Electric"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Maintenance"],
      required: true,
      default: "Active",
    },
    kycStatus: {
      type: String,
      enum: ["Verified", "Pending", "Rejected"],
      default: "Pending",
    },
    // Additional useful fields
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },
    lastMaintenanceDate: {
      type: Date,
      default: null,
    },
    nextMaintenanceDate: {
      type: Date,
      default: null,
    },
    mileage: {
      type: Number,
      default: 0,
      min: 0,
    },
    insuranceExpiryDate: {
      type: Date,
      default: null,
    },
    registrationExpiryDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes for better query performance
VehicleSchema.index({ registrationNumber: 1 })
VehicleSchema.index({ status: 1 })
VehicleSchema.index({ category: 1 })
VehicleSchema.index({ vehicleType: 1 })
VehicleSchema.index({ assignedDriver: 1 })

// Virtual for vehicle age
VehicleSchema.virtual("age").get(function () {
  return new Date().getFullYear() - this.year
})

// Virtual for maintenance status
VehicleSchema.virtual("maintenanceStatus").get(function () {
  if (!this.nextMaintenanceDate) return "Not Scheduled"
  const today = new Date()
  const daysUntilMaintenance = Math.ceil((this.nextMaintenanceDate - today) / (1000 * 60 * 60 * 24))

  if (daysUntilMaintenance < 0) return "Overdue"
  if (daysUntilMaintenance <= 7) return "Due Soon"
  return "Scheduled"
})

// Pre-save middleware to set next maintenance date
VehicleSchema.pre("save", function (next) {
  if (this.isNew && !this.nextMaintenanceDate) {
    // Set next maintenance date to 6 months from now for new vehicles
    const sixMonthsFromNow = new Date()
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
    this.nextMaintenanceDate = sixMonthsFromNow
  }
  next()
})

module.exports = mongoose.model("Vehicle", VehicleSchema)

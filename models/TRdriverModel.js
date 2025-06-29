const mongoose = require("mongoose")

// Random location generator within Ahmedabad
function getRandomAhmedabadLocation() {
  const minLat = 22.95
  const maxLat = 23.15
  const minLng = 72.50
  const maxLng = 72.75

  return {
    lat: +(Math.random() * (maxLat - minLat) + minLat).toFixed(6),
    lng: +(Math.random() * (maxLng - minLng) + minLng).toFixed(6),
  }
}

const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Driver name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: [true, "Phone number is required"],
    unique: true,
    trim: true,
  },
  vehicle: {
    type: String,
    trim: true,
  },
  vehicleType: {
    type: String,
    trim: true,
  },
  licensePlate: {
    type: String,
    trim: true,
    uppercase: true,
  },
  kycStatus: {
    type: String,
    enum: ["Pending", "Verified", "Rejected"],
    default: "Pending",
  },
  status: {
    type: String,
    enum: ["active", "idle", "offline", "emergency"],
    default: "idle",
  },
  location: {
    lat: {
      type: Number,
      default: () => getRandomAhmedabadLocation().lat,
    },
    lng: {
      type: Number,
      default: () => getRandomAhmedabadLocation().lng,
    },
  },
  speed: {
    type: Number,
    default: 0,
  },
  batteryLevel: {
    type: Number,
    default: 100,
    min: 0,
    max: 100,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  completedTrips: {
    type: Number,
    default: 0,
  },
  isOnline: {
    type: Boolean,
    default: true,
  },
  joinDate: {
    type: Date,
    default: Date.now,
  },
  lastUpdate: {
    type: Date,
    default: Date.now,
  },
  destination: String,
  eta: String,
  tripId: String,
  passenger: String,
  licensePhoto: String,
  panPhoto: String,
  selfiePhoto: String,
  vehiclePhoto: String,
  numberplatePhoto: String,
  faceToken: {
    type: String,
    trim: true,
  },
  driverType: {
    type: String,
    enum: ["Primary", "Sub-driver"],
    default: "Primary",
  },
  primaryDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    default: null,
  },
  subDrivers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },
  ],
})

module.exports = mongoose.model("Driver", driverSchema)

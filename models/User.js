const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  phone: { 
    type: String, 
    trim: true 
  },
  role: {
    type: String,
    // ** FIX: Updated roles to match frontend expectations **
    enum: ['Customer', 'Driver', 'Vendor', 'Admin'], 
    default: 'Customer'
  },
  status: {
    type: String,
    // ** FIX: Added status field **
    enum: ['Active', 'Pending', 'Suspended'],
    default: 'Active'
  },
  location: { 
    type: String, 
    trim: true 
  },
  // ** FIX: Added fields expected by the frontend **
  joinDate: { 
    type: Date, 
    default: Date.now 
  },
  lastUpdate: { 
    type: Date, 
    default: Date.now 
  },
  rating: { 
    type: Number, 
    default: 0 
  },
    rides: { 
    type: Number, 
    default: 0 
  },
  vehicleDetails: { 
    type: String 
  },
  otp: { 
    type: Number 
  },
  otpExpiry: { 
    type: Date 
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true // This automatically adds createdAt and updatedAt fields
});

// Middleware to update the `lastUpdate` field on every save
userSchema.pre('save', function(next) {
  this.lastUpdate = new Date();
  next();
});

module.exports = mongoose.model('User', userSchema);
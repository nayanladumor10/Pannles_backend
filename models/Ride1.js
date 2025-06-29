const mongoose = require('mongoose');

const RideSchema = new mongoose.Schema({
  service: {
    type: String,
    enum: ['Ride', 'Food-Delivery', 'Courier-Delivery'],
    required: true,
    index: true
  },
  type: { 
    type: String,
    required: true
  },   
  user: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', 
      required: true
    },
    name: {
      type: String,
      required: true
    }
  },   
  driver: {  
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver'
    },
    name: {
      type: String
    }
  },
  rideTime: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  statusHistory: [{
    status: String,
    changedAt: Date
  }]
}, { 
  timestamps: true,
  toJSON: { getters: true } // Apply getters when converting to JSON
});

module.exports = mongoose.model('Ride', RideSchema);
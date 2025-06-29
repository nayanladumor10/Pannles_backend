const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema({
  id: String,
  riderId: String,
  riderName: String,
  driverId: String,
  driverName: String,
  status: String,
  pickup: String,
  drop: String,
  time: String,
  date: String,
  price: String,
  distance: String,
  duration: String,
  logs: Array,
  currentLocation: Object,
  chatMessages: Array, 
});

module.exports = mongoose.model("Ride2", rideSchema);

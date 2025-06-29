const Ride = require('../models/Ride2');


exports.getRides = async (req, res) => {
  try {
    const status = req.query.status;
    const rides = status ? await Ride.find({ status }) : await Ride.find();
    res.json(rides);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRideLogs = async (req, res) => {
  try {
    const logs = await RideLog.find({ rideId: req.params.rideId });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRideStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ride = await Ride.findByIdAndUpdate(req.params.rideId, { status }, { new: true });
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    await RideLog.create({ rideId: ride._id, action: `Status updated to ${status}` });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

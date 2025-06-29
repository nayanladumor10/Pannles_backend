const express = require("express");
const Ride = require("../models/Ride");
const router = express.Router();
// const Ride = require("../models/Ride");



router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const rides = await Ride.find(query).sort({ createdAt: -1 });
    res.json(rides);
  } catch (err) {
    console.error("Failed to fetch rides", err);
    res.status(500).json({ error: "Failed to fetch rides" });
  }
});

// Create new ride
router.post("/", async (req, res) => {
  try {
    const ride = new Ride(req.body);
    await ride.save();

    const io = req.app.get("io");
    io.emit("newRide", ride); // Broadcast new ride to all clients

    res.status(201).json(ride);
  } catch (err) {
    res.status(400).json({ error: "Failed to save ride" });
  }
});

// Update ride status
// routes/rides.js
router.put("/:id/status", async (req, res) => {
  try {
    const ride = await Ride.findOneAndUpdate(
      { id: req.params.id },
      { status: req.body.status },
      { new: true }
    );

    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    const io = req.app.get("io");
    io.emit("rideStatusUpdate", ride);

    res.json(ride);
  } catch (err) {
    console.error("Error updating ride status:", err);
    res.status(500).json({ message: "Error updating ride status" });
  }
});


router.get("/:id/logs", async (req, res) => {
  try {
    const ride = await Ride.findOne({ id: req.params.id }); // or use _id
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    // Return dummy logs for now
    res.json([
      { timestamp: new Date(), message: "Ride started" },
      { timestamp: new Date(), message: "Ride in progress" },
    ]);
  } catch (err) {
    console.error("Error fetching ride logs:", err);
    res.status(500).json({ message: "Error fetching ride logs" });
  }
});


// Save chat message to a ride
router.post("/:id/chat", async (req, res) => {
  const { sender, message } = req.body;

  try {
    const ride = await Ride.findOne({ id: req.params.id });
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    const chat = {
      sender,
      message,
      timestamp: new Date(),
    };

    ride.chatMessages.push(chat);
    await ride.save();

    // Emit chat message to all clients (optional)
    const io = req.app.get("io");
    io.emit("chatMessage", {
      rideId: ride.id,
      ...chat,
    });

    res.status(200).json(chat);
  } catch (err) {
    console.error("Error saving chat message:", err);
    res.status(500).json({ message: "Error saving chat message" });
  }
});


module.exports = router;

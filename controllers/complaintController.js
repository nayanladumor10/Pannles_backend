// const Complaint = require("../models/Complaint");
// const Vehicle = require("../models/Vehicle");
// const Driver = require("../models/TRdriverModel");
// const realTimeEvents = require("../services/realTimeService"); // Import realTimeEvents

// exports.addComplaint = async (req, res) => {
//   try {
//     const { vehicleId, driverId, customerName, customerPhone, description } = req.body;
//     const vehicle = await Vehicle.findById(vehicleId);
//     const driver = await Driver.findById(driverId);
//     if (!vehicle || !driver) {
//       return res.status(404).json({ success: false, message: "Vehicle or Driver not found" });
//     }
//     const complaint = new Complaint({ vehicleId, driverId, customerName, customerPhone, description });
//     await complaint.save();
//     realTimeEvents.sendModelUpdates("complaints");
//     res.status(201).json({
//       success: true,
//       data: complaint,
//       pagination: { total: 1, page: 1, pageSize: 1 },
//     });
//   } catch (error) {
//     res.status(400).json({ success: false, message: error.message });
//   }
// };

// exports.getAllComplaints = async (req, res) => {
//   try {
//     const { status } = req.query;
//     const query = status ? { status } : {};
//     const complaints = await Complaint.find(query)
//       .populate("vehicleId", "registrationNumber")
//       .populate("driverId", "name phone");
//     res.status(200).json({
//       success: true,
//       data: complaints,
//       pagination: { total: complaints.length, page: 1, pageSize: complaints.length },
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// exports.getComplaintById = async (req, res) => {
//   try {
//     const complaint = await Complaint.findById(req.params.id)
//       .populate("vehicleId", "registrationNumber")
//       .populate("driverId", "name phone");
//     if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found" });
//     res.status(200).json({
//       success: true,
//       data: complaint,
//       pagination: { total: 1, page: 1, pageSize: 1 },
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// exports.updateComplaint = async (req, res) => {
//   try {
//     const { status, resolutionNotes } = req.body;
//     const complaint = await Complaint.findByIdAndUpdate(
//       req.params.id,
//       { status, resolutionNotes, updatedAt: new Date() },
//       { new: true, runValidators: true }
//     )
//       .populate("vehicleId", "registrationNumber")
//       .populate("driverId", "name phone");
//     if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found" });
//     realTimeEvents.sendModelUpdates("complaints"); // Use imported realTimeEvents
//     res.status(200).json({
//       success: true,
//       data: complaint,
//       pagination: { total: 1, page: 1, pageSize: 1 },
//     });
//   } catch (error) {
//     res.status(400).json({ success: false, message: error.message });
//   }
// };

// exports.deleteComplaint = async (req, res) => {
//   try {
//     const complaint = await Complaint.findByIdAndDelete(req.params.id);
//     if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found" });
//     realTimeEvents.sendModelUpdates("complaints"); // Use imported realTimeEvents
//     res.status(200).json({ success: true, message: "Complaint deleted" });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };


const Complaint = require("../models/Complaint");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/TRdriverModel");
const realTimeEvents = require("../services/realTimeService");

exports.addComplaint = async (req, res) => {
  try {
    const { vehicleId, driverId, customerName, customerPhone, description } = req.body;
    const vehicle = await Vehicle.findById(vehicleId);
    const driver = await Driver.findById(driverId);
    if (!vehicle || !driver) {
      return res.status(404).json({ success: false, message: "Vehicle or Driver not found" });
    }
    const complaint = new Complaint({ vehicleId, driverId, customerName, customerPhone, description });
    await complaint.save();
    realTimeEvents.sendModelUpdates("complaints");
    res.status(201).json({
      success: true,
      data: complaint,
      pagination: { total: 1, page: 1, pageSize: 1 },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getAllComplaints = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const complaints = await Complaint.find(query)
      .populate("vehicleId", "registrationNumber")
      .populate("driverId", "name phone");
    res.status(200).json({
      success: true,
      data: complaints,
      pagination: { total: complaints.length, page: 1, pageSize: complaints.length },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("vehicleId", "registrationNumber")
      .populate("driverId", "name phone");
    if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found" });
    res.status(200).json({
      success: true,
      data: complaint,
      pagination: { total: 1, page: 1, pageSize: 1 },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateComplaint = async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    // Validate status is one of the allowed values
    if (status && !["Pending", "Investigating", "Resolved", "Refunded"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status, resolutionNotes, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate("vehicleId", "registrationNumber")
      .populate("driverId", "name phone");

    if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found" });

    // Trigger real-time update
    realTimeEvents.sendModelUpdates("complaints");

    res.status(200).json({
      success: true,
      data: complaint,
      pagination: { total: 1, page: 1, pageSize: 1 },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found" });
    realTimeEvents.sendModelUpdates("complaints");
    res.status(200).json({ success: true, message: "Complaint deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
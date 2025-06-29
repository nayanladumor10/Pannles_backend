const mongoose = require("mongoose");

const ComplaintSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, match: /^\+?[1-9]\d{9,14}$/ },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Pending", "Investigating", "Resolved", "Refunded"],
      default: "Pending",
    },
    resolutionNotes: { type: String, default: null },
    messages: [
      {
        sender: { type: String, required: true },
        message: { type: String, required: true },
        time: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

ComplaintSchema.index({ vehicleId: 1 });
ComplaintSchema.index({ driverId: 1 });
ComplaintSchema.index({ status: 1 });

module.exports = mongoose.model("Complaint", ComplaintSchema);
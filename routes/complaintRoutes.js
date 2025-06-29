const express = require("express");
const router = express.Router();
const complaintController = require("../controllers/complaintController");

router.post("/", complaintController.addComplaint);
router.get("/", complaintController.getAllComplaints);
router.get("/:id", complaintController.getComplaintById);
router.put("/:id", complaintController.updateComplaint);
router.delete("/:id", complaintController.deleteComplaint);

module.exports = router;
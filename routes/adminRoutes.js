const express = require("express")
const router = express.Router()
const {
  getAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  updateAdminStatus,
  verifyAdminSelfie, // Import the new controller
} = require("../controllers/adminController")
const upload = require("../middlewares/uploadMiddleware")

// Debug middleware
router.use((req, res, next) => {
  console.log(`ADMIN ROUTE: ${req.method} ${req.originalUrl}`);
  next();
});

// Routes for /api/admins
router.route("/")
  .get(getAdmins)
  .post(upload.single('selfie'), createAdmin); // Handle selfie upload on creation

// Route to verify an admin's selfie before they perform an action
router.route("/:id/verify-selfie")
  .post(upload.single('selfie'), verifyAdminSelfie);

// Routes for /api/admins/:id
router.route("/:id")
  .get(getAdminById)
  .put(updateAdmin)
  .delete(deleteAdmin);

// Route for updating admin status
router.route("/:id/status")
  .patch(updateAdminStatus);

module.exports = router

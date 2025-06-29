// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Sign Up Route

router.post('/signup', authController.signup);

// Send OTP Route

router.post('/send-otp', authController.sendOtp);

// Verify OTP Route

router.post('/verify-otp', authController.verifyOtp);

// Login Route

router.post('/login', authController.login);

// Verify Login OTP Route

router.post('/login/verify-otp', authController.verifyLoginOtp);


module.exports = router;

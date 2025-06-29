const nodemailer = require('nodemailer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require("dotenv").config()


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Signup
exports.signup = async (req, res) => {
  const { name, email, password, confirmPassword, role } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: 'Email already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    role
  });

  await newUser.save();
  res.status(201).json({ message: 'User created successfully. Please verify email with OTP.' });
};

// Send OTP
exports.sendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: 'Email is required' });

  const otp = crypto.randomInt(100000, 999999);
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.otp = otp;
  user.otpExpiry = Date.now() + 5 * 60 * 1000;
  await user.save();

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is: ${otp}`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Error sending OTP:', err);
    res.status(500).json({ message: 'Failed to send OTP', error: err.toString() });
  }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (Date.now() > user.otpExpiry) {
    return res.status(400).json({ message: 'OTP has expired' });
  }

  if (user.otp !== parseInt(otp)) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  user.isVerified = true;
  user.otp = null;
  user.otpExpiry = null;
  await user.save();

  res.status(200).json({ message: 'OTP verified successfully' });
};

// Login: Send OTP
exports.login = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const otp = crypto.randomInt(100000, 999999);
  user.otp = otp;
  user.otpExpiry = Date.now() + 5 * 60 * 1000;
  await user.save();

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your Login OTP',
    text: `Your OTP for login is: ${otp}`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'OTP sent for login' });
  } catch (err) {
    console.error('Error sending login OTP:', err);
    res.status(500).json({ message: 'Failed to send login OTP', error: err.toString() });
  }
};

// Verify Login OTP and issue JWT
exports.verifyLoginOtp = async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (Date.now() > user.otpExpiry) {
    return res.status(400).json({ message: 'OTP has expired' });
  }

  if (user.otp !== parseInt(otp)) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  const token = jwt.sign({ userId: user._id, role: user.role },process.env.JWT_SECRET, {
    expiresIn: '1h'
  });

  res.status(200).json({ message: 'Login successful', token });
};

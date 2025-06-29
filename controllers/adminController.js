const Admin = require("../models/adminModel")
const mongoose = require("mongoose")
const axios = require("axios")
const FormData = require("form-data")
const fs = require("fs")

// --- Face++ API Configuration ---
const FACEPLUSPLUS_API_KEY = "ugsIgRsnHtwyhBoPCFykX5cEneQplNb2";
const FACEPLUSPLUS_API_SECRET = "AVJHolEltcTBtOYXr3VQOjC4SjgmQvzu";
const FACEPLUSPLUS_DETECT_URL = "https://api-us.faceplusplus.com/facepp/v3/detect";
const FACEPLUSPLUS_COMPARE_URL = "https://api-us.faceplusplus.com/facepp/v3/compare";
const CONFIDENCE_THRESHOLD = 80; // Min confidence for a match

// --- Face++ Helper Functions ---
const detectFace = async (filePath) => {
  try {
    const formData = new FormData();
    formData.append("api_key", FACEPLUSPLUS_API_KEY);
    formData.append("api_secret", FACEPLUSPLUS_API_SECRET);
    formData.append("image_file", fs.createReadStream(filePath));

    const response = await axios.post(FACEPLUSPLUS_DETECT_URL, formData, {
      headers: formData.getHeaders(),
    });

    if (response.data.faces && response.data.faces.length > 0) {
      return { success: true, faceToken: response.data.faces[0].face_token };
    }
    return { success: false, message: "No face detected in the image." };
  } catch (error) {
    const errorMessage = error.response?.data?.error_message || "Face detection failed.";
    return { success: false, message: errorMessage };
  }
};

const compareFaces = async (faceToken1, faceToken2) => {
    try {
        const formData = new FormData();
        formData.append('api_key', FACEPLUSPLUS_API_KEY);
        formData.append('api_secret', FACEPLUSPLUS_API_SECRET);
        formData.append('face_token1', faceToken1);
        formData.append('face_token2', faceToken2);

        const response = await axios.post(FACEPLUSPLUS_COMPARE_URL, formData, {
            headers: formData.getHeaders(),
        });
        
        return { success: true, confidence: response.data.confidence };
    } catch (error) {
        const errorMessage = error.response?.data?.error_message || "Face comparison failed.";
        return { success: false, message: errorMessage };
    }
};


// Helper to transform data for frontend
const transformAdmin = (admin) => ({
  id: admin._id.toString(),
  name: admin.name,
  email: admin.email,
  role: admin.role,
  status: admin.status,
  permissions: admin.permissions,
  lastLogin: admin.lastLogin,
  selfie: admin.selfie,
  faceToken: admin.faceToken, // Include faceToken
});

const getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({}).select("-password");
    res.json({
      success: true,
      admins: admins.map(transformAdmin),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch admins" });
  }
};

const createAdmin = async (req, res) => {
  try {
    const { name, email, password, role, status } = req.body;
    let permissions;
    try {
        permissions = req.body.permissions ? JSON.parse(req.body.permissions) : undefined;
    } catch(e) {
        return res.status(400).json({ success: false, message: "Invalid permissions format." });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required." });
    }

    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ success: false, message: "Admin with this email already exists." });
    }
    
    const adminData = { name, email, password, role, status, permissions };

    // --- Face++ Integration on Create ---
    if (req.file) {
      const selfiePath = req.file.path;
      const detectionResult = await detectFace(selfiePath);

      if (detectionResult.success) {
        adminData.selfie = selfiePath;
        adminData.faceToken = detectionResult.faceToken;
        console.log(`✅ Admin Face Detected. Token: ${detectionResult.faceToken}`);
      } else {
        // If face detection fails, still create the admin but without selfie/token
        console.warn(`⚠️ Warning: ${detectionResult.message} for new admin. Creating without selfie.`);
        fs.unlinkSync(selfiePath); // Clean up the invalid photo
      }
    }

    const admin = await Admin.create(adminData);
    const newAdmin = await Admin.findById(admin._id).select("-password");

    res.status(201).json(transformAdmin(newAdmin));

  } catch (error) {
    console.error("Error in createAdmin:", error);
    res.status(500).json({ success: false, message: "Failed to create admin", error: error.message });
  }
};

const verifyAdminSelfie = async (req, res) => {
    try {
        const { id } = req.params;
        const admin = await Admin.findById(id);

        if (!admin || !admin.faceToken) {
            return res.status(400).json({ success: false, message: "Admin has no selfie on record for verification." });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Verification selfie is required." });
        }
        
        const verificationSelfiePath = req.file.path;
        const detectionResult = await detectFace(verificationSelfiePath);

        if (!detectionResult.success) {
            fs.unlinkSync(verificationSelfiePath);
            return res.status(400).json({ success: false, message: `Verification failed: ${detectionResult.message}` });
        }
        
        const faceToken2 = detectionResult.faceToken;
        const comparisonResult = await compareFaces(admin.faceToken, faceToken2);
        
        fs.unlinkSync(verificationSelfiePath);

        if (!comparisonResult.success) {
            return res.status(500).json({ success: false, message: `Face comparison API error: ${comparisonResult.message}` });
        }

        if (comparisonResult.confidence >= CONFIDENCE_THRESHOLD) {
            res.json({ success: true, message: `Admin verified successfully (Confidence: ${comparisonResult.confidence.toFixed(2)}%).` });
        } else {
            res.status(400).json({ success: false, message: `Admin verification failed. Faces do not match (Confidence: ${comparisonResult.confidence.toFixed(2)}%).` });
        }

    } catch (error) {
        console.error("❌ Error during admin selfie verification:", error);
        res.status(500).json({ success: false, message: "An internal server error occurred." });
    }
};

const getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select("-password");
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    res.json(transformAdmin(admin));
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch admin" });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, status, permissions, password } = req.body;

    const admin = await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    admin.name = name || admin.name;
    admin.email = email || admin.email;
    admin.role = role || admin.role;
    admin.status = status || admin.status;
    admin.permissions = permissions || admin.permissions;

    if (password) {
      admin.password = password;
    }

    const updatedAdmin = await admin.save();
    res.json(transformAdmin(updatedAdmin));
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update admin", error: error.message });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id); // FIX: Using findByIdAndDelete

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    res.json({ success: true, message: "Admin deleted successfully" });
  } catch (error) {
    console.error("Failed to delete admin:", error);
    res.status(500).json({ success: false, message: "Failed to delete admin" });
  }
};

const updateAdminStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    res.json({
      success: true,
      message: `Admin status updated to ${status}`,
      admin: transformAdmin(admin),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update admin status" });
  }
};

module.exports = {
  getAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  updateAdminStatus,
  verifyAdminSelfie,
};
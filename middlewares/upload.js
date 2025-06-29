const multer = require("multer")
const path = require("path")
const fs = require("fs")

// Create uploads directory if it doesn't exist
const uploadsDir = "uploads"
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log("📁 Created uploads directory")
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const filename = file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    console.log("📄 Saving file as:", filename)
    cb(null, filename)
  },
})

// File filter
const fileFilter = (req, file, cb) => {
  console.log("🔍 Checking file:", file.originalname, "Type:", file.mimetype)

  // Accept images only
  if (file.mimetype.startsWith("image/")) {
    cb(null, true)
  } else {
    console.log("❌ Rejected file type:", file.mimetype)
    cb(new Error(`Only image files are allowed! Received: ${file.mimetype}`), false)
  }
}

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 2, // Maximum 2 files
  },
  fileFilter: fileFilter,
})

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error("❌ Multer error:", error.message)

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 5MB.",
        error: error.message,
      })
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum is 2 files.",
        error: error.message,
      })
    }

    return res.status(400).json({
      success: false,
      message: "File upload error",
      error: error.message,
    })
  }

  if (error.message.includes("Only image files")) {
    return res.status(400).json({
      success: false,
      message: error.message,
      error: "Invalid file type",
    })
  }

  next(error)
}

module.exports = upload
module.exports.handleUploadError = handleUploadError

const multer = require("multer")
const path = require("path")
const fs = require("fs")

const createFolder = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true })
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = ""

    // Handle main driver documents
    if (file.fieldname === "license") folder = "license"
    else if (file.fieldname === "pan") folder = "pan"
    else if (file.fieldname === "selfie") folder = "selfie"
    else if (file.fieldname === "aadhar") folder = "aadhar"
    else if (file.fieldname === "insurance") folder = "insurance"
    else if (file.fieldname === "vehicle") folder = "vehicle"
    else if (file.fieldname === "numberplate") folder = "numberplate"
    // Handle sub-driver documents (e.g., subDriver_0_license, subDriver_1_pan, etc.)
    else if (file.fieldname.startsWith("subDriver_")) {
      const parts = file.fieldname.split("_")
      const docType = parts[2] // license, pan, selfie, vehicle, numberplate
      folder = `subdrivers/${docType}`
    }

    const uploadPath = path.join(__dirname, `../uploads/${folder}`)
    createFolder(uploadPath)
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    let prefix = file.fieldname

    // For sub-driver files, include the index in the filename
    if (file.fieldname.startsWith("subDriver_")) {
      const parts = file.fieldname.split("_")
      prefix = `subDriver_${parts[1]}_${parts[2]}`
    }

    cb(null, `${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`)
  },
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs for documents, but only images for selfies
    if (file.fieldname === "selfie" || file.fieldname.includes("_selfie")) {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true)
      } else {
        cb(new Error("Only image files are allowed for selfies!"), false)
      }
    } else {
      const allowed = [".jpg", ".jpeg", ".png", ".pdf"]
      const ext = path.extname(file.originalname).toLowerCase()
      if (allowed.includes(ext)) {
        cb(null, true)
      } else {
        cb(new Error("Invalid file type."), false)
      }
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
}) 

module.exports = upload
 
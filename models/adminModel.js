const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const permissionSchema = mongoose.Schema({
  read: {
    type: Boolean,
    default: false,
  },
  write: {
    type: Boolean,
    default: false,
  },
  delete: {
    type: Boolean,
    default: false,
  },
})

const adminSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please add a valid email"],
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    role: {
      type: String,
      enum: ["super_admin", "finance", "support"],
      default: "support",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    permissions: {
      users: {
        type: permissionSchema,
        default: { read: false, write: false, delete: false },
      },
      vehicles: {
        type: permissionSchema,
        default: { read: false, write: false, delete: false },
      },
      bookings: {
        type: permissionSchema,
        default: { read: false, write: false, delete: false },
      },
      payments: {
        type: permissionSchema,
        default: { read: false, write: false, delete: false },
      },
      settings: {
        type: permissionSchema,
        default: { read: false, write: false, delete: false },
      },
    },
    selfie: {
      type: String, // Field to store path to the admin's selfie
    },
    faceToken: {
      type: String, // Field for Face++ face token
      trim: true,
    },
  },
  {
    timestamps: true,
  },
)

// Create index for search functionality
adminSchema.index({ name: "text", email: "text", role: "text" })

// Hash password before saving
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next()
  }

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next();
})

// Set default permissions based on role
adminSchema.pre("save", function (next) {
  if (this.isModified("role")) {
    if (this.role === "super_admin") {
      this.permissions = {
        users: { read: true, write: true, delete: true },
        vehicles: { read: true, write: true, delete: true },
        bookings: { read: true, write: true, delete: true },
        payments: { read: true, write: true, delete: true },
        settings: { read: true, write: true, delete: true },
      }
    } else if (this.role === "finance") {
      this.permissions = {
        users: { read: true, write: false, delete: false },
        vehicles: { read: true, write: false, delete: false },
        bookings: { read: true, write: false, delete: false },
        payments: { read: true, write: true, delete: false },
        settings: { read: false, write: false, delete: false },
      }
    } else if (this.role === "support") {
      this.permissions = {
        users: { read: true, write: true, delete: false },
        vehicles: { read: true, write: true, delete: false },
        bookings: { read: true, write: true, delete: false },
        payments: { read: false, write: false, delete: false },
        settings: { read: false, write: false, delete: false },
      }
    }
  }
  next()
})

// Match password method
adminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

const Admin = mongoose.model("Admin", adminSchema)

module.exports = Admin

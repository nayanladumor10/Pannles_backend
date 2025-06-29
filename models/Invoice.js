const mongoose = require("mongoose")

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false, // Made optional
    },
    items: [
      {
        description: {
          type: String,
          required: false, // Made optional
        },
        quantity: {
          type: Number,
          required: false, // Made optional
          min: 1,
          default: 1,
        },
        unitPrice: {
          type: Number,
          required: false, // Made optional
          min: 0,
          default: 0,
        },
        taxRate: {
          type: Number,
          default: 0,
        },
      },
    ],
    subtotal: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "overdue", "cancelled"],
      default: "pending",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Made optional
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false, // Made optional
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
)

// Pre-save hook to generate invoice number and calculate totals
invoiceSchema.pre("save", async function (next) {
  // Only generate number for new documents and if invoiceNumber is not already set
  if (this.isNew && !this.invoiceNumber) {
    try {
      let attempts = 0
      const maxAttempts = 10

      while (attempts < maxAttempts) {
        // Get current date for invoice number
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, "0")
        const day = String(now.getDate()).padStart(2, "0")

        // Find the highest invoice number for today
        const todayStart = new Date(year, now.getMonth(), now.getDate())
        const todayEnd = new Date(year, now.getMonth(), now.getDate() + 1)

        const lastInvoice = await mongoose
          .model("Invoice")
          .findOne({
            createdAt: {
              $gte: todayStart,
              $lt: todayEnd,
            },
            invoiceNumber: { $exists: true, $ne: null },
          })
          .sort({ invoiceNumber: -1 })

        let nextNumber = 1
        if (lastInvoice && lastInvoice.invoiceNumber) {
          // Extract number from last invoice (format: INV-YYYY-MM-DD-XXX)
          const match = lastInvoice.invoiceNumber.match(/INV-\d{4}-\d{2}-\d{2}-(\d+)$/)
          if (match) {
            nextNumber = Number.parseInt(match[1]) + 1
          }
        }

        // Add random component to avoid collisions
        const randomComponent = Math.floor(Math.random() * 100)
        const finalNumber = nextNumber + randomComponent

        const invoiceNumber = `INV-${year}-${month}-${day}-${String(finalNumber).padStart(3, "0")}`

        // Check if this number already exists
        const existingInvoice = await mongoose.model("Invoice").findOne({ invoiceNumber })

        if (!existingInvoice) {
          this.invoiceNumber = invoiceNumber
          break
        }

        attempts++

        if (attempts >= maxAttempts) {
          // Fallback to timestamp-based number
          const timestamp = Date.now()
          this.invoiceNumber = `INV-${year}-${month}-${day}-${timestamp.toString().slice(-6)}`
          break
        }
      }
    } catch (error) {
      console.error("Error generating invoice number:", error)
      // Fallback to simple timestamp
      const timestamp = Date.now()
      this.invoiceNumber = `INV-${timestamp}`
    }
  }

  // Calculate totals based on amount (simple calculation for now)
  if (this.amount) {
    this.subtotal = this.amount
    this.tax = 0 // No tax calculation for now
    this.total = this.amount
  }

  // If items exist, calculate from items
  if (this.items && this.items.length > 0) {
    let subtotal = 0
    for (const item of this.items) {
      subtotal += (item.quantity || 1) * (item.unitPrice || 0)
    }
    this.subtotal = subtotal
    this.tax = subtotal * (this.items.reduce((acc, item) => Math.max(acc, item.taxRate || 0), 0) / 100)
    this.total = this.subtotal + this.tax
  }

  next()
})

// Create indexes for better query performance
invoiceSchema.index({ customerName: 1 })
invoiceSchema.index({ status: 1 })
invoiceSchema.index({ date: -1 })
invoiceSchema.index({ dueDate: 1 })
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true })
invoiceSchema.index({ createdAt: -1 })

const Invoice = mongoose.model("Invoice", invoiceSchema)

module.exports = Invoice
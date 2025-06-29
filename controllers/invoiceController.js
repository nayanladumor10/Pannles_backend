const Invoice = require("../models/Invoice") // Fixed import path

// @desc    Get all invoices with filtering and pagination
// @route   GET /api/invoices
// @access  Public
exports.getInvoices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      startDate,
      endDate,
      sortBy = "date",
      sortOrder = "desc",
    } = req.query

    // Build query
    const query = {}

    // Search functionality
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { invoiceNumber: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ]
    }

    // Status filter
    if (status && status !== "all") {
      query.status = status
    }

    // Date range filter
    if (startDate || endDate) {
      query.date = {}
      if (startDate) {
        query.date.$gte = new Date(startDate)
      }
      if (endDate) {
        query.date.$lte = new Date(endDate)
      }
    }

    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder === "desc" ? -1 : 1

    // Calculate pagination
    const pageNum = Math.max(1, Number.parseInt(page))
    const limitNum = Math.max(1, Math.min(100, Number.parseInt(limit)))
    const skip = (pageNum - 1) * limitNum

    // Execute query
    const invoices = await Invoice.find(query).sort(sort).skip(skip).limit(limitNum)

    // Get total count for pagination
    const totalItems = await Invoice.countDocuments(query)
    const totalPages = Math.ceil(totalItems / limitNum)

    res.status(200).json({
      success: true,
      data: invoices,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    })
  } catch (error) {
    console.error("Error in getInvoices:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching invoices",
      error: error.message,
    })
  }
}

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Public
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      })
    }

    res.status(200).json({
      success: true,
      data: invoice,
    })
  } catch (error) {
    console.error("Error in getInvoice:", error)

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID format",
      })
    }

    res.status(500).json({
      success: false,
      message: "Error fetching invoice",
      error: error.message,
    })
  }
}

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Public
exports.createInvoice = async (req, res) => {
  try {
    const { customerName, amount, date, dueDate, status, description } = req.body

    console.log("Received data:", req.body)

    // Validate required fields
    if (!customerName || customerName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      })
    }

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: "Amount is required",
      })
    }

    if (!dueDate) {
      return res.status(400).json({
        success: false,
        message: "Due date is required",
      })
    }

    // Validate amount
    const numAmount = Number.parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a valid number greater than 0",
      })
    }

    // Validate dates
    const invoiceDate = date ? new Date(date) : new Date()
    const dueDateObj = new Date(dueDate)

    if (isNaN(invoiceDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice date format",
      })
    }

    if (isNaN(dueDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid due date format",
      })
    }

    // Validate status
    const validStatuses = ["pending", "paid", "overdue", "cancelled"]
    const invoiceStatus = status || "pending"
    if (!validStatuses.includes(invoiceStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: " + validStatuses.join(", "),
      })
    }

    // Create invoice data object with only the fields we have
    const invoiceData = {
      customerName: customerName.trim(),
      amount: numAmount,
      date: invoiceDate,
      dueDate: dueDateObj,
      status: invoiceStatus,
      description: description ? description.trim() : "",
    }

    console.log("Creating invoice with data:", invoiceData)

    // Create and save the invoice with retry logic
    let savedInvoice
    let attempts = 0
    const maxAttempts = 5

    while (attempts < maxAttempts) {
      try {
        const invoice = new Invoice(invoiceData)
        savedInvoice = await invoice.save()
        break
      } catch (error) {
        if (error.code === 11000 && error.message.includes("invoiceNumber") && attempts < maxAttempts - 1) {
          console.log(`Attempt ${attempts + 1} failed due to duplicate invoice number, retrying...`)
          attempts++
          // Small delay before retry
          await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200))
          continue
        } else {
          throw error
        }
      }
    }

    if (!savedInvoice) {
      throw new Error("Failed to create invoice after multiple attempts")
    }

    console.log("Invoice created successfully:", savedInvoice)

    // Emit socket event for real-time updates
    const io = req.app.get("io")
    if (io) {
      io.to("invoices").emit("invoiceCreated", savedInvoice)
    }

    res.status(201).json({
      success: true,
      data: savedInvoice,
      message: "Invoice created successfully",
    })
  } catch (error) {
    console.error("Error in createInvoice:", error)

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: messages,
      })
    }

    if (error.code === 11000) {
      if (error.message.includes("invoiceNumber")) {
        return res.status(400).json({
          success: false,
          message: "Failed to generate unique invoice number. Please try again.",
        })
      }
      return res.status(400).json({
        success: false,
        message: "Duplicate entry detected",
      })
    }

    res.status(500).json({
      success: false,
      message: "Error creating invoice",
      error: error.message,
    })
  }
}

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Public
exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      })
    }

    // Prepare update data
    const updateData = { ...req.body }

    // Validate and convert dates
    if (updateData.date) {
      const dateObj = new Date(updateData.date)
      if (isNaN(dateObj.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format",
        })
      }
      updateData.date = dateObj
    }

    if (updateData.dueDate) {
      const dueDateObj = new Date(updateData.dueDate)
      if (isNaN(dueDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid due date format",
        })
      }
      updateData.dueDate = dueDateObj
    }

    // Validate and convert amount
    if (updateData.amount !== undefined) {
      const numAmount = Number.parseFloat(updateData.amount)
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Amount must be a valid number greater than 0",
        })
      }
      updateData.amount = numAmount
    }

    // Validate status
    if (updateData.status) {
      const validStatuses = ["pending", "paid", "overdue", "cancelled"]
      if (!validStatuses.includes(updateData.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be one of: " + validStatuses.join(", "),
        })
      }
    }

    // Validate customer name
    if (updateData.customerName !== undefined) {
      if (!updateData.customerName || updateData.customerName.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Customer name cannot be empty",
        })
      }
      updateData.customerName = updateData.customerName.trim()
    }

    // Don't allow updating invoiceNumber
    delete updateData.invoiceNumber

    const updatedInvoice = await Invoice.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })

    // Emit socket event for real-time updates
    const io = req.app.get("io")
    if (io) {
      io.to("invoices").emit("invoiceUpdated", updatedInvoice)
    }

    res.status(200).json({
      success: true,
      data: updatedInvoice,
      message: "Invoice updated successfully",
    })
  } catch (error) {
    console.error("Error in updateInvoice:", error)

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID format",
      })
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: messages,
      })
    }

    res.status(500).json({
      success: false,
      message: "Error updating invoice",
      error: error.message,
    })
  }
}

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Public
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      })
    }

    await Invoice.findByIdAndDelete(req.params.id)

    // Emit socket event for real-time updates
    const io = req.app.get("io")
    if (io) {
      io.to("invoices").emit("invoiceDeleted", { id: req.params.id, invoice })
    }

    res.status(200).json({
      success: true,
      message: "Invoice deleted successfully",
    })
  } catch (error) {
    console.error("Error in deleteInvoice:", error)

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID format",
      })
    }

    res.status(500).json({
      success: false,
      message: "Error deleting invoice",
      error: error.message,
    })
  }
}

// @desc    Get invoice statistics
// @route   GET /api/invoices/stats
// @access  Public
exports.getInvoiceStats = async (req, res) => {
  try {
    const stats = await Invoice.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ])

    const totalInvoices = await Invoice.countDocuments()
    const totalRevenue = await Invoice.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ])

    res.status(200).json({
      success: true,
      data: {
        statusBreakdown: stats,
        totalInvoices,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
    })
  } catch (error) {
    console.error("Error in getInvoiceStats:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching invoice statistics",
      error: error.message,
    })
  }
}
// Location: /middleware/reportsMiddleware.js
// Middleware for reports-specific functionality and validation

const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query

  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: "Invalid date format. Please use YYYY-MM-DD format.",
      })
    }

    if (start > end) {
      return res.status(400).json({
        message: "Start date cannot be after end date.",
      })
    }

    // Limit date range to prevent performance issues
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    if (daysDiff > 365) {
      return res.status(400).json({
        message: "Date range cannot exceed 365 days.",
      })
    }
  }

  next()
}

const validateTimeRange = (req, res, next) => {
  const { timeRange } = req.query

  if (timeRange && !["day", "week", "month"].includes(timeRange)) {
    return res.status(400).json({
      message: "Invalid time range. Must be one of: day, week, month.",
    })
  }

  next()
}

const validateDriverFilter = (req, res, next) => {
  const { driverFilter } = req.query

  if (driverFilter && driverFilter !== "all") {
    // In a real app, you might want to validate that the driver ID exists
    // For now, we'll just check if it's a valid MongoDB ObjectId format
    const ObjectId = require("mongoose").Types.ObjectId
    if (!ObjectId.isValid(driverFilter)) {
      return res.status(400).json({
        message: "Invalid driver ID format.",
      })
    }
  }

  next()
}

module.exports = {
  validateDateRange,
  validateTimeRange,
  validateDriverFilter,
}

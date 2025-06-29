// Location: /controllers/reportsController.js
// Fixed version with persistent sample data generation

const Ride = require("../models/Ride1")
const Driver = require("../models/TRdriverModel")

// Persistent sample data cache
let sampleDataCache = {
  rides: [],
  drivers: [],
  lastGenerated: null,
  isInitialized: false,
}

// Cache to store last valid data
const dataCache = {
  lastValidSummary: null,
  lastValidEarnings: null,
  lastValidDrivers: null,
  lastUpdate: null,
}

// Generate persistent sample data that stays consistent
const generatePersistentSampleData = () => {
  if (sampleDataCache.isInitialized && sampleDataCache.lastGenerated) {
    const timeSinceGenerated = Date.now() - sampleDataCache.lastGenerated.getTime()
    // Increase cache time to 24 hours instead of 1 hour
    if (timeSinceGenerated < 24 * 60 * 60 * 1000) {
      console.log("📊 Using existing sample data cache")
      return sampleDataCache
    }
  }

  console.log("📊 Generating new persistent sample data...")

  const now = new Date()
  const drivers = [
    { id: "driver1", name: "John Smith" },
    { id: "driver2", name: "Sarah Johnson" },
    { id: "driver3", name: "Mike Wilson" },
    { id: "driver4", name: "Emily Davis" },
    { id: "driver5", name: "David Brown" },
  ]

  const services = ["Standard", "Premium", "Express", "Economy"]
  const statuses = ["completed", "cancelled", "pending", "in-progress"]
  const rides = []

  // Generate rides for the last 30 days
  for (let day = 0; day < 30; day++) {
    const date = new Date(now)
    date.setDate(date.getDate() - day)

    // Generate 15-50 rides per day
    const ridesPerDay = Math.floor(Math.random() * 35) + 15

    for (let i = 0; i < ridesPerDay; i++) {
      const rideTime = new Date(date)
      rideTime.setHours(Math.floor(Math.random() * 24))
      rideTime.setMinutes(Math.floor(Math.random() * 60))

      const driver = drivers[Math.floor(Math.random() * drivers.length)]
      const service = services[Math.floor(Math.random() * services.length)]

      // 85% completion rate
      const status =
        Math.random() < 0.85
          ? "completed"
          : Math.random() < 0.1
            ? "cancelled"
            : Math.random() < 0.03
              ? "pending"
              : "in-progress"

      const baseAmount = service === "Premium" ? 35 : service === "Express" ? 28 : service === "Economy" ? 15 : 22

      const amount = status === "completed" ? baseAmount + Math.random() * 15 - 7.5 : 0

      rides.push({
        _id: `ride_${day}_${i}`,
        rideTime,
        driver: {
          _id: driver.id,
          name: driver.name,
        },
        service,
        status,
        amount: Math.round(amount * 100) / 100,
        createdAt: rideTime,
      })
    }
  }

  sampleDataCache = {
    rides,
    drivers,
    lastGenerated: new Date(),
    isInitialized: true,
  }

  console.log(`📊 Generated ${rides.length} sample rides`)
  return sampleDataCache
}

// Simulate database queries with sample data
const simulateRideQuery = (matchQuery) => {
  const sampleData = generatePersistentSampleData()

  return sampleData.rides.filter((ride) => {
    // Apply date filter
    if (matchQuery.rideTime) {
      const rideTime = new Date(ride.rideTime)
      if (matchQuery.rideTime.$gte && rideTime < matchQuery.rideTime.$gte) return false
      if (matchQuery.rideTime.$lte && rideTime > matchQuery.rideTime.$lte) return false
    }

    // Apply driver filter
    if (matchQuery["driver._id"] && ride.driver._id !== matchQuery["driver._id"]) {
      return false
    }

    // Apply status filter
    if (matchQuery.status && ride.status !== matchQuery.status) {
      return false
    }

    return true
  })
}

// Helper function to validate data before sending - less aggressive
const validateAndCacheData = (data, type) => {
  if (!data || typeof data !== "object") {
    console.warn(`⚠️ Invalid ${type} data received:`, data)
    return dataCache[`lastValid${type}`] || null
  }

  // Check if data has meaningful values - be less strict
  if (type === "Summary") {
    // Only reject if ALL important fields are missing/undefined
    if (
      data.totalEarnings === undefined &&
      data.totalRides === undefined &&
      data.avgPerRide === undefined &&
      data.cancellationRate === undefined
    ) {
      console.warn(`⚠️ Empty ${type} data, using cached version`)
      return dataCache[`lastValid${type}`] || null
    }
    dataCache.lastValidSummary = data
  } else if (type === "Earnings") {
    // Only reject if chartData is completely missing or empty
    if (!data.chartData || !Array.isArray(data.chartData)) {
      console.warn(`⚠️ Invalid ${type} chartData, using cached version`)
      return dataCache[`lastValid${type}`] || null
    }
    dataCache.lastValidEarnings = data
  } else if (type === "Drivers") {
    // Only reject if tableData is completely missing or empty
    if (!data.tableData || !Array.isArray(data.tableData)) {
      console.warn(`⚠️ Invalid ${type} tableData, using cached version`)
      return dataCache[`lastValid${type}`] || null
    }
    dataCache.lastValidDrivers = data
  }

  dataCache.lastUpdate = new Date()
  return data
}

// Get default data structure
const getDefaultData = (type) => {
  switch (type) {
    case "Summary":
      return {
        totalEarnings: 0,
        earningsChange: 0,
        totalRides: 0,
        ridesChange: 0,
        avgPerRide: 0,
        avgPerRideChange: 0,
        cancellationRate: 0,
        cancellationRateChange: 0,
        averageEarningPerRide: 0,
        drivers: [],
      }
    case "Earnings":
      return {
        chartData: [],
        summary: {
          totalEarnings: 0,
          totalRides: 0,
          avgEarningPerRide: 0,
          cancellationRate: 0,
        },
        hasData: false,
      }
    case "Drivers":
      return {
        pieChartData: [],
        tableData: [],
        hasData: false,
      }
    default:
      return {}
  }
}

// Calculate percentage changes with more realistic logic
const calculateChange = (current, previous) => {
  // If both are 0, no change
  if (current === 0 && previous === 0) return 0

  // If previous is 0 but current has value, show as reasonable percentage
  if (previous === 0 && current > 0) {
    return Math.min(50, Math.round(current * 0.1))
  }

  // If current is 0 but previous had value, show negative change
  if (current === 0 && previous > 0) return -100

  // Normal percentage calculation
  const change = ((current - previous) / previous) * 100

  // Cap extreme changes at ±200% for more realistic display
  return Math.max(-200, Math.min(200, Math.round(change * 10) / 10))
}

// Get comprehensive earnings report with date filtering
exports.getEarningsReport = async (req, res) => {
  try {
    const { startDate, endDate, driverFilter = "all", timeRange = "week" } = req.query

    console.log(`📊 Getting earnings report with params:`, { startDate, endDate, driverFilter, timeRange })

    // Parse dates or use defaults
    let start, end
    if (startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
    } else {
      end = new Date()
      start = new Date()

      if (timeRange === "day") {
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
      } else if (timeRange === "week") {
        start.setDate(end.getDate() - 6)
        start.setHours(0, 0, 0, 0)
      } else if (timeRange === "month") {
        start.setMonth(end.getMonth() - 1)
        start.setHours(0, 0, 0, 0)
      }
    }

    // Build match query
    const matchQuery = {
      rideTime: { $gte: start, $lte: end },
    }

    // Add driver filter if specified
    if (driverFilter !== "all") {
      matchQuery["driver._id"] = driverFilter
    }

    console.log(`🔍 Query:`, matchQuery)

    // Try real database first, fallback to sample data
    let totalRidesCount = 0
    let useRealData = false

    try {
      totalRidesCount = await Ride.countDocuments(matchQuery)
      useRealData = totalRidesCount > 0
      console.log(`📊 Real database rides found: ${totalRidesCount}`)
    } catch (error) {
      console.log(`⚠️ Database not available, using sample data`)
      useRealData = false
    }

    let earningsData = []
    let summaryStats = []
    let cancellationData = []

    if (useRealData) {
      // Use real database data
      ;[earningsData, summaryStats, cancellationData] = await Promise.all([
        Ride.aggregate([
          {
            $match: {
              ...matchQuery,
              status: "completed",
            },
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: timeRange === "day" ? "%H" : "%Y-%m-%d",
                  date: "$rideTime",
                },
              },
              totalEarnings: { $sum: "$amount" },
              totalRides: { $sum: 1 },
              avgEarningPerRide: { $avg: "$amount" },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Ride.aggregate([
          {
            $match: {
              ...matchQuery,
              status: "completed",
            },
          },
          {
            $group: {
              _id: null,
              totalEarnings: { $sum: "$amount" },
              totalRides: { $sum: 1 },
              avgEarningPerRide: { $avg: "$amount" },
            },
          },
        ]),
        Ride.aggregate([
          {
            $match: matchQuery,
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: timeRange === "day" ? "%H" : "%Y-%m-%d",
                  date: "$rideTime",
                },
              },
              totalRides: { $sum: 1 },
              cancelledRides: {
                $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
              },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ])
    } else {
      // Use sample data
      console.log(`📊 Using sample data for earnings report`)
      const allRides = simulateRideQuery(matchQuery)
      const completedRides = allRides.filter((ride) => ride.status === "completed")

      // Group by time period
      const groupedData = {}
      const cancellationGroupedData = {}

      allRides.forEach((ride) => {
        const rideTime = new Date(ride.rideTime)
        const key =
          timeRange === "day" ? rideTime.getHours().toString().padStart(2, "0") : rideTime.toISOString().split("T")[0]

        if (!groupedData[key]) {
          groupedData[key] = { totalEarnings: 0, totalRides: 0 }
        }
        if (!cancellationGroupedData[key]) {
          cancellationGroupedData[key] = { totalRides: 0, cancelledRides: 0 }
        }

        if (ride.status === "completed") {
          groupedData[key].totalEarnings += ride.amount
          groupedData[key].totalRides += 1
        }

        cancellationGroupedData[key].totalRides += 1
        if (ride.status === "cancelled") {
          cancellationGroupedData[key].cancelledRides += 1
        }
      })

      // Convert to aggregation format
      earningsData = Object.entries(groupedData)
        .map(([key, data]) => ({
          _id: key,
          totalEarnings: data.totalEarnings,
          totalRides: data.totalRides,
          avgEarningPerRide: data.totalRides > 0 ? data.totalEarnings / data.totalRides : 0,
        }))
        .sort((a, b) => a._id.localeCompare(b._id))

      cancellationData = Object.entries(cancellationGroupedData)
        .map(([key, data]) => ({
          _id: key,
          totalRides: data.totalRides,
          cancelledRides: data.cancelledRides,
        }))
        .sort((a, b) => a._id.localeCompare(b._id))

      // Summary stats
      const totalEarnings = completedRides.reduce((sum, ride) => sum + ride.amount, 0)
      const totalCompletedRides = completedRides.length

      summaryStats =
        totalCompletedRides > 0
          ? [
              {
                _id: null,
                totalEarnings,
                totalRides: totalCompletedRides,
                avgEarningPerRide: totalEarnings / totalCompletedRides,
              },
            ]
          : []
    }

    console.log(`📊 Earnings data points: ${earningsData.length}`)
    console.log(`📊 Cancellation data points: ${cancellationData.length}`)

    // Format chart data
    const chartData = earningsData.map((item) => {
      const cancellation = cancellationData.find((c) => c._id === item._id) || { cancelledRides: 0 }
      return {
        name: timeRange === "day" ? `${item._id}:00` : item._id,
        earnings: Math.round(item.totalEarnings || 0),
        rides: item.totalRides || 0,
        cancellations: cancellation.cancelledRides || 0,
        avgPerRide: Math.round((item.avgEarningPerRide || 0) * 100) / 100,
      }
    })

    // Always provide summary even if no data
    const summary = summaryStats[0] || { totalEarnings: 0, totalRides: 0, avgEarningPerRide: 0 }
    const totalCancellations = cancellationData.reduce((sum, item) => sum + (item.cancelledRides || 0), 0)
    const totalAllRides = cancellationData.reduce((sum, item) => sum + (item.totalRides || 0), 0)

    const response = {
      chartData,
      summary: {
        totalEarnings: Math.round((summary.totalEarnings || 0) * 100) / 100,
        totalRides: summary.totalRides || 0,
        avgEarningPerRide: Math.round((summary.avgEarningPerRide || 0) * 100) / 100,
        cancellationRate: totalAllRides > 0 ? Math.round((totalCancellations / totalAllRides) * 100 * 10) / 10 : 0,
      },
      dateRange: { start, end },
      filters: { driverFilter, timeRange },
      hasData: chartData.length > 0,
      timestamp: new Date().toISOString(),
      isSampleData: !useRealData,
    }

    console.log(`✅ Sending earnings response:`, {
      chartDataLength: response.chartData.length,
      totalEarnings: response.summary.totalEarnings,
      totalRides: response.summary.totalRides,
      isSampleData: response.isSampleData,
    })

    // Validate and cache the response
    const validatedResponse = validateAndCacheData(response, "Earnings")
    if (validatedResponse) {
      res.json(validatedResponse)
    } else {
      res.json({
        ...getDefaultData("Earnings"),
        message: "Using default data due to validation failure",
      })
    }

    // Emit real-time update to all connected clients (only if data is valid)
    const io = req.app.get("io")
    if (io && validatedResponse) {
      io.emit("earningsReportUpdate", validatedResponse)
    }
  } catch (error) {
    console.error("❌ Error in getEarningsReport:", error)

    // Return cached data on error
    const cachedData = dataCache.lastValidEarnings
    if (cachedData) {
      console.log(`🔄 Returning cached data due to error`)
      res.json(cachedData)
    } else {
      res.status(500).json({
        message: "Failed to generate earnings report",
        error: error.message,
        ...getDefaultData("Earnings"),
      })
    }
  }
}

// Get driver performance report
exports.getDriverPerformanceReport = async (req, res) => {
  try {
    const { startDate, endDate, timeRange = "week" } = req.query

    console.log(`👥 Getting driver performance with params:`, { startDate, endDate, timeRange })

    let start, end
    if (startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
    } else {
      end = new Date()
      start = new Date()
      start.setDate(end.getDate() - (timeRange === "day" ? 0 : timeRange === "week" ? 6 : 29))
      start.setHours(0, 0, 0, 0)
    }

    // Try real database first
    let useRealData = false
    let driverStats = []

    try {
      const ridesWithDriversCount = await Ride.countDocuments({
        rideTime: { $gte: start, $lte: end },
        "driver._id": { $exists: true },
      })
      useRealData = ridesWithDriversCount > 0
      console.log(`👥 Real database rides with drivers found: ${ridesWithDriversCount}`)
    } catch (error) {
      console.log(`⚠️ Database not available for drivers, using sample data`)
      useRealData = false
    }

    if (useRealData) {
      // Use real database
      driverStats = await Ride.aggregate([
        {
          $match: {
            rideTime: { $gte: start, $lte: end },
            "driver._id": { $exists: true },
          },
        },
        {
          $group: {
            _id: "$driver._id",
            driverName: { $first: "$driver.name" },
            totalRides: { $sum: 1 },
            completedRides: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            cancelledRides: {
              $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
            },
            totalEarnings: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$amount", 0] },
            },
            avgEarningPerRide: {
              $avg: { $cond: [{ $eq: ["$status", "completed"] }, "$amount", null] },
            },
          },
        },
        {
          $addFields: {
            completionRate: {
              $multiply: [{ $divide: ["$completedRides", "$totalRides"] }, 100],
            },
            cancellationRate: {
              $multiply: [{ $divide: ["$cancelledRides", "$totalRides"] }, 100],
            },
          },
        },
        { $sort: { totalEarnings: -1 } },
      ])
    } else {
      // Use sample data
      console.log(`👥 Using sample data for driver performance`)
      const sampleData = generatePersistentSampleData()
      const matchQuery = {
        rideTime: { $gte: start, $lte: end },
      }
      const filteredRides = simulateRideQuery(matchQuery)

      // Group by driver
      const driverGroups = {}
      filteredRides.forEach((ride) => {
        const driverId = ride.driver._id
        if (!driverGroups[driverId]) {
          driverGroups[driverId] = {
            _id: driverId,
            driverName: ride.driver.name,
            totalRides: 0,
            completedRides: 0,
            cancelledRides: 0,
            totalEarnings: 0,
          }
        }

        driverGroups[driverId].totalRides += 1
        if (ride.status === "completed") {
          driverGroups[driverId].completedRides += 1
          driverGroups[driverId].totalEarnings += ride.amount
        } else if (ride.status === "cancelled") {
          driverGroups[driverId].cancelledRides += 1
        }
      })

      driverStats = Object.values(driverGroups)
        .map((driver) => ({
          ...driver,
          avgEarningPerRide: driver.completedRides > 0 ? driver.totalEarnings / driver.completedRides : 0,
          completionRate: driver.totalRides > 0 ? (driver.completedRides / driver.totalRides) * 100 : 0,
          cancellationRate: driver.totalRides > 0 ? (driver.cancelledRides / driver.totalRides) * 100 : 0,
        }))
        .sort((a, b) => b.totalEarnings - a.totalEarnings)
    }

    console.log(`👥 Driver stats found: ${driverStats.length}`)

    // Format data for pie chart
    const pieChartData = driverStats.map((driver) => ({
      id: driver._id,
      name: driver.driverName || "Unknown Driver",
      earnings: Math.round((driver.totalEarnings || 0) * 100) / 100,
      rides: driver.totalRides || 0,
    }))

    // Format data for table
    const tableData = driverStats.map((driver) => ({
      id: driver._id,
      name: driver.driverName || "Unknown Driver",
      rides: driver.totalRides || 0,
      completedRides: driver.completedRides || 0,
      cancelledRides: driver.cancelledRides || 0,
      earnings: Math.round((driver.totalEarnings || 0) * 100) / 100,
      avgPerRide: Math.round((driver.avgEarningPerRide || 0) * 100) / 100,
      completionRate: Math.round((driver.completionRate || 0) * 10) / 10,
      cancellationRate: Math.round((driver.cancellationRate || 0) * 10) / 10,
    }))

    const response = {
      pieChartData,
      tableData,
      dateRange: { start, end },
      hasData: tableData.length > 0,
      timestamp: new Date().toISOString(),
      isSampleData: !useRealData,
    }

    console.log(`✅ Sending driver response:`, {
      driversCount: response.tableData.length,
      hasData: response.hasData,
      isSampleData: response.isSampleData,
    })

    // Validate and cache the response
    const validatedResponse = validateAndCacheData(response, "Drivers")
    if (validatedResponse) {
      res.json(validatedResponse)
    } else {
      res.json({
        ...getDefaultData("Drivers"),
        message: "Using default data due to validation failure",
      })
    }

    // Emit real-time update
    const io = req.app.get("io")
    if (io && validatedResponse) {
      io.emit("driverPerformanceUpdate", validatedResponse)
    }
  } catch (error) {
    console.error("❌ Error in getDriverPerformanceReport:", error)

    // Return cached data on error
    const cachedData = dataCache.lastValidDrivers
    if (cachedData) {
      console.log(`🔄 Returning cached driver data due to error`)
      res.json(cachedData)
    } else {
      res.status(500).json({
        message: "Failed to generate driver performance report",
        error: error.message,
        ...getDefaultData("Drivers"),
      })
    }
  }
}

// Get rides analysis report
exports.getRidesAnalysisReport = async (req, res) => {
  try {
    const { startDate, endDate, timeRange = "week" } = req.query

    let start, end
    if (startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
    } else {
      end = new Date()
      start = new Date()
      start.setDate(end.getDate() - (timeRange === "day" ? 0 : timeRange === "week" ? 6 : 29))
      start.setHours(0, 0, 0, 0)
    }

    // Always use sample data for rides analysis for now
    console.log(`🚗 Using sample data for rides analysis`)
    const matchQuery = {
      rideTime: { $gte: start, $lte: end },
    }
    const filteredRides = simulateRideQuery(matchQuery)

    // Group by time period
    const groupedData = {}
    filteredRides.forEach((ride) => {
      const rideTime = new Date(ride.rideTime)
      const key =
        timeRange === "day" ? rideTime.getHours().toString().padStart(2, "0") : rideTime.toISOString().split("T")[0]

      if (!groupedData[key]) {
        groupedData[key] = {
          totalRides: 0,
          completedRides: 0,
          cancelledRides: 0,
          pendingRides: 0,
          inProgressRides: 0,
        }
      }

      groupedData[key].totalRides += 1
      if (ride.status === "completed") groupedData[key].completedRides += 1
      else if (ride.status === "cancelled") groupedData[key].cancelledRides += 1
      else if (ride.status === "pending") groupedData[key].pendingRides += 1
      else if (ride.status === "in-progress") groupedData[key].inProgressRides += 1
    })

    // Format chart data
    const chartData = Object.entries(groupedData)
      .map(([key, data]) => ({
        name: timeRange === "day" ? `${key}:00` : key,
        rides: data.totalRides,
        completed: data.completedRides,
        cancelled: data.cancelledRides,
        pending: data.pendingRides,
        inProgress: data.inProgressRides,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    // Service distribution
    const serviceGroups = {}
    filteredRides.forEach((ride) => {
      if (!serviceGroups[ride.service]) {
        serviceGroups[ride.service] = { count: 0, earnings: 0 }
      }
      serviceGroups[ride.service].count += 1
      if (ride.status === "completed") {
        serviceGroups[ride.service].earnings += ride.amount
      }
    })

    const serviceData = {
      labels: Object.keys(serviceGroups),
      data: Object.values(serviceGroups).map((s) => s.count),
      earnings: Object.values(serviceGroups).map((s) => Math.round(s.earnings * 100) / 100),
    }

    const response = {
      chartData,
      serviceDistribution: serviceData,
      dateRange: { start, end },
      hasData: chartData.length > 0,
      timestamp: new Date().toISOString(),
      isSampleData: true,
    }

    res.json(response)

    // Emit real-time update
    const io = req.app.get("io")
    if (io) {
      io.emit("ridesAnalysisUpdate", response)
    }
  } catch (error) {
    console.error("❌ Error in getRidesAnalysisReport:", error)
    res.status(500).json({
      message: "Failed to generate rides analysis report",
      error: error.message,
    })
  }
}

// Get real-time dashboard summary for reports page
exports.getReportsSummary = async (req, res) => {
  try {
    const { timeRange = "day" } = req.query
    console.log(`📊 Getting reports summary for timeRange: ${timeRange}`)

    const now = new Date()
    let currentStart, currentEnd, previousStart, previousEnd

    // Calculate current and previous periods based on timeRange
    if (timeRange === "day") {
      // Today vs Yesterday
      currentStart = new Date(now)
      currentStart.setHours(0, 0, 0, 0)
      currentEnd = new Date(now)
      currentEnd.setHours(23, 59, 59, 999)

      previousStart = new Date(currentStart)
      previousStart.setDate(previousStart.getDate() - 1)
      previousEnd = new Date(previousStart)
      previousEnd.setHours(23, 59, 59, 999)
    } else if (timeRange === "week") {
      // This week vs Last week
      currentEnd = new Date(now)
      currentStart = new Date(now)
      currentStart.setDate(currentStart.getDate() - 6)
      currentStart.setHours(0, 0, 0, 0)

      previousEnd = new Date(currentStart)
      previousEnd.setDate(previousEnd.getDate() - 1)
      previousEnd.setHours(23, 59, 59, 999)
      previousStart = new Date(previousEnd)
      previousStart.setDate(previousStart.getDate() - 6)
      previousStart.setHours(0, 0, 0, 0)
    } else if (timeRange === "month") {
      // This month vs Last month
      currentEnd = new Date(now)
      currentStart = new Date(now)
      currentStart.setMonth(currentStart.getMonth() - 1)
      currentStart.setHours(0, 0, 0, 0)

      previousEnd = new Date(currentStart)
      previousEnd.setDate(previousEnd.getDate() - 1)
      previousEnd.setHours(23, 59, 59, 999)
      previousStart = new Date(previousEnd)
      previousStart.setMonth(previousStart.getMonth() - 1)
      previousStart.setHours(0, 0, 0, 0)
    }

    console.log(`📊 Current period: ${currentStart.toISOString()} to ${currentEnd.toISOString()}`)
    console.log(`📊 Previous period: ${previousStart.toISOString()} to ${previousEnd.toISOString()}`)

    // Try real database first
    let useRealData = false
    let currentData = { totalRides: 0, totalEarnings: 0, completedRides: 0, cancelledRides: 0 }
    let previousData = { totalRides: 0, totalEarnings: 0, completedRides: 0, cancelledRides: 0 }

    try {
      const totalRidesCount = await Ride.countDocuments({
        rideTime: { $gte: previousStart, $lte: currentEnd },
      })
      useRealData = totalRidesCount > 0
      console.log(`📊 Real database total rides in both periods: ${totalRidesCount}`)
    } catch (error) {
      console.log(`⚠️ Database not available for summary, using sample data`)
      useRealData = false
    }

    if (useRealData) {
      // Use real database
      const [currentStats, previousStats] = await Promise.all([
        Ride.aggregate([
          {
            $match: {
              rideTime: { $gte: currentStart, $lte: currentEnd },
            },
          },
          {
            $group: {
              _id: null,
              totalRides: { $sum: 1 },
              totalEarnings: {
                $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$amount", 0] },
              },
              completedRides: {
                $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
              },
              cancelledRides: {
                $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
              },
            },
          },
        ]),
        Ride.aggregate([
          {
            $match: {
              rideTime: { $gte: previousStart, $lte: previousEnd },
            },
          },
          {
            $group: {
              _id: null,
              totalRides: { $sum: 1 },
              totalEarnings: {
                $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$amount", 0] },
              },
              completedRides: {
                $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
              },
              cancelledRides: {
                $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
              },
            },
          },
        ]),
      ])

      currentData = currentStats[0] || currentData
      previousData = previousStats[0] || previousData
    } else {
      // Use sample data
      console.log(`📊 Using sample data for summary`)
      const sampleData = generatePersistentSampleData()

      const currentRides = sampleData.rides.filter((ride) => {
        const rideTime = new Date(ride.rideTime)
        return rideTime >= currentStart && rideTime <= currentEnd
      })

      const previousRides = sampleData.rides.filter((ride) => {
        const rideTime = new Date(ride.rideTime)
        return rideTime >= previousStart && rideTime <= previousEnd
      })

      // Calculate current period data
      currentData = {
        totalRides: currentRides.length,
        totalEarnings: currentRides.filter((r) => r.status === "completed").reduce((sum, r) => sum + r.amount, 0),
        completedRides: currentRides.filter((r) => r.status === "completed").length,
        cancelledRides: currentRides.filter((r) => r.status === "cancelled").length,
      }

      // Calculate previous period data
      previousData = {
        totalRides: previousRides.length,
        totalEarnings: previousRides.filter((r) => r.status === "completed").reduce((sum, r) => sum + r.amount, 0),
        completedRides: previousRides.filter((r) => r.status === "completed").length,
        cancelledRides: previousRides.filter((r) => r.status === "cancelled").length,
      }
    }

    console.log(`📊 Current period data:`, currentData)
    console.log(`📊 Previous period data:`, previousData)

    const summary = {
      totalEarnings: Math.round((currentData.totalEarnings || 0) * 100) / 100,
      earningsChange: calculateChange(currentData.totalEarnings || 0, previousData.totalEarnings || 0),
      totalRides: currentData.totalRides || 0,
      ridesChange: calculateChange(currentData.totalRides || 0, previousData.totalRides || 0),
      avgPerRide:
        currentData.totalRides > 0 ? Math.round((currentData.totalEarnings / currentData.totalRides) * 100) / 100 : 0,
      avgPerRideChange: calculateChange(
        currentData.totalRides > 0 ? currentData.totalEarnings / currentData.totalRides : 0,
        previousData.totalRides > 0 ? previousData.totalEarnings / previousData.totalRides : 0,
      ),
      cancellationRate:
        currentData.totalRides > 0
          ? Math.round((currentData.cancelledRides / currentData.totalRides) * 100 * 10) / 10
          : 0,
      cancellationRateChange: calculateChange(
        currentData.totalRides > 0 ? (currentData.cancelledRides / currentData.totalRides) * 100 : 0,
        previousData.totalRides > 0 ? (previousData.cancelledRides / previousData.totalRides) * 100 : 0,
      ),
      averageEarningPerRide:
        currentData.totalRides > 0 ? Math.round((currentData.totalEarnings / currentData.totalRides) * 100) / 100 : 0,
      drivers: [],
      timestamp: new Date().toISOString(),
      timeRange: timeRange,
      isSampleData: !useRealData,
    }

    console.log(`✅ Sending summary response for ${timeRange}:`, summary)

    res.json(summary)

    // Emit real-time update
    const io = req.app.get("io")
    if (io) {
      io.emit("reportsSummaryUpdate", summary)
    }
  } catch (error) {
    console.error("❌ Error in getReportsSummary:", error)
    res.status(500).json({
      message: "Failed to generate reports summary",
      error: error.message,
    })
  }
}

// Export cache for debugging
exports.getDataCache = () => sampleDataCache
exports.clearDataCache = () => {
  sampleDataCache = {
    rides: [],
    drivers: [],
    lastGenerated: null,
    isInitialized: false,
  }
}

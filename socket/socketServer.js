const { Server } = require("socket.io")
const dashboardController = require("../controllers/dashboardController")

/**
 * Unified Socket.IO server that handles all socket connections:
 * - Dashboard real-time updates
 * - Admin management events
 * - Billing and invoices
 * - Driver location tracking
 * - Reports and analytics
 */
class SocketServer {
  constructor() {
    this.io = null
    this.clients = {
      all: new Set(),
      dashboard: new Set(),
      admin: new Set(),
      billing: new Set(),
      drivers: new Set(),
      reports: new Set(),
      rides: new Set(),
    }
    this.intervals = {}
    this.dataCache = new Map()
    this.broadcastInProgress = false
  }

  initialize(server, app) {
    // Initialize Socket.IO server
    this.io = new Server(server, {
      cors: {
        origin: ["http://localhost:3000", "http://localhost:3001", "*"],
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    })

    // Store app reference for controllers
    this.app = app

    // Set up connection handler
    this.setupConnectionHandler()

    // Set up periodic updates
    this.setupPeriodicUpdates()

    // Make socket emitters available to the app
    this.registerEmitters()

    // Return cleanup function
    return this.cleanup.bind(this)
  }

  setupConnectionHandler() {
    this.io.on("connection", (socket) => {
      // Add to global clients
      this.clients.all.add(socket)
      console.log(`🔌 Client connected: ${socket.id}`)

      // Handle room joining
      socket.on("join-room", (room) => {
        if (this.clients[room]) {
          socket.join(room)
          this.clients[room].add(socket)
          console.log(`🏠 Socket ${socket.id} joined room: ${room}`)

          // Send initial data based on room
          this.sendInitialData(socket, room)
        }
      })

      // Auto-join dashboard room for backward compatibility
      socket.join("dashboard")
      this.clients.dashboard.add(socket)
      this.sendInitialData(socket, "dashboard")

      // Join admin management room
      socket.join("admin-management")
      this.clients.admin.add(socket)
      socket.emit("connected", {
        message: "Connected to admin management system",
        timestamp: new Date().toISOString(),
      })

      // Join billing room
      socket.join("billing")
      this.clients.billing.add(socket)

      // Join reports room
      socket.join("reports")
      this.clients.reports.add(socket)

      // ---- DASHBOARD EVENTS ----
      this.setupDashboardEvents(socket)

      // ---- ADMIN EVENTS ----
      this.setupAdminEvents(socket)

      // ---- BILLING EVENTS ----
      this.setupBillingEvents(socket)

      // ---- DRIVER EVENTS ----
      this.setupDriverEvents(socket)

      // ---- RIDE EVENTS ----
      this.setupRideEvents(socket)

      // ---- REPORTS EVENTS ----
      this.setupReportsEvents(socket)

      // Handle disconnection
      socket.on("disconnect", () => {
        // Remove from all client sets
        Object.values(this.clients).forEach((clientSet) => clientSet.delete(socket))
        console.log(`🔌 Client disconnected: ${socket.id}`)
      })
    })
  }

  setupDashboardEvents(socket) {
    // Dashboard events are handled through periodic updates and change streams
    // But we can add specific event handlers here if needed
  }

  setupAdminEvents(socket) {
    // Admin events are primarily handled through change streams in server.js
    // But we can add specific event handlers here if needed
  }

  setupBillingEvents(socket) {
    // Listen for invoice-related events
    socket.on("requestInvoices", async (params) => {
      try {
        console.log(`📄 Client ${socket.id} requesting invoices:`, params)
        // Handle invoice requests
        // This would typically call a controller method
      } catch (error) {
        console.error(`❌ Error handling invoice request from ${socket.id}:`, error)
        socket.emit("error", { message: "Failed to fetch invoices" })
      }
    })
  }

  setupDriverEvents(socket) {
    // Handle driver status updates
    socket.on("updateDriverStatus", async (data) => {
      try {
        const { driverId, status } = data
        // This would typically call a controller method

        // Broadcast to all clients in the drivers room
        this.io.to("drivers").emit("driverStatusChanged", {
          driverId,
          status,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error("Error updating driver status:", error)
        socket.emit("error", {
          message: "Failed to update driver status",
          error: error.message,
        })
      }
    })

    // Handle location updates
    socket.on("updateLocation", async (data) => {
      try {
        const { driverId, lat, lng, speed } = data
        // This would typically call a controller method

        // Broadcast location update to all clients in the drivers room
        this.io.to("drivers").emit("locationUpdate", {
          driverId,
          location: { lat, lng },
          speed,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error("Error updating location:", error)
        socket.emit("error", {
          message: "Failed to update location",
          error: error.message,
        })
      }
    })

    // Handle emergency alerts
    socket.on("emergencyAlert", async (data) => {
      try {
        const { driverId, message } = data
        // This would typically call a controller method

        // Broadcast emergency alert to all clients
        this.io.emit("emergencyAlert", {
          driverId,
          message: message || `Emergency alert from driver ${driverId}`,
          timestamp: new Date().toISOString(),
          priority: "high",
        })
      } catch (error) {
        console.error("Error handling emergency alert:", error)
        socket.emit("error", {
          message: "Failed to process emergency alert",
          error: error.message,
        })
      }
    })
  }

  setupRideEvents(socket) {
    // Handle chat messages
    socket.on("chatMessage", ({ rideId, message }) => {
      this.io.to("rides").emit("chatMessage", {
        rideId,
        message,
        timestamp: new Date().toISOString(),
      })
      console.log(`💬 Chat message for ride ${rideId}:`, message)
    })

    // Handle ride status updates
    socket.on("rideStatusUpdate", async ({ rideId, status }) => {
      console.log("Broadcasting ride status update", rideId, status)
      this.io.to("rides").emit("rideStatusUpdate", {
        rideId,
        status,
        timestamp: new Date().toISOString(),
      })

      // Also update dashboard if ride status affects stats
      setTimeout(() => this.sendDashboardUpdates(), 1000)
    })
  }

  setupReportsEvents(socket) {
    // Handle reports data requests
    socket.on("requestEarningsReport", async (params) => {
      try {
        console.log(`📊 Client ${socket.id} requesting earnings report:`, params)
        // Store client filters for future updates
        if (this.clients.reports.has(socket)) {
          socket.filters = params
        }

        // This would typically call a controller method
        // For now, we'll just send cached data if available
        const cachedData = this.dataCache.get("earningsReport")
        if (cachedData) {
          socket.emit("earningsReportData", cachedData)
        }
      } catch (error) {
        console.error(`❌ Error handling earnings report request from ${socket.id}:`, error)
        socket.emit("reportError", { message: "Failed to fetch earnings report" })
      }
    })

    socket.on("requestDriverPerformance", async (params) => {
      try {
        console.log(`📊 Client ${socket.id} requesting driver performance:`, params)
        const cachedData = this.dataCache.get("driverPerformance")
        if (cachedData) {
          socket.emit("driverPerformanceData", cachedData)
        }
      } catch (error) {
        console.error(`❌ Error handling driver performance request from ${socket.id}:`, error)
        socket.emit("reportError", { message: "Failed to fetch driver performance" })
      }
    })

    socket.on("requestRidesAnalysis", async (params) => {
      try {
        console.log(`📊 Client ${socket.id} requesting rides analysis:`, params)
        const cachedData = this.dataCache.get("ridesAnalysis")
        if (cachedData) {
          socket.emit("ridesAnalysisData", cachedData)
        }
      } catch (error) {
        console.error(`❌ Error handling rides analysis request from ${socket.id}:`, error)
        socket.emit("reportError", { message: "Failed to fetch rides analysis" })
      }
    })

    socket.on("requestReportsSummary", async () => {
      try {
        console.log(`📊 Client ${socket.id} requesting reports summary`)
        const cachedData = this.dataCache.get("reportsSummary")
        if (cachedData) {
          socket.emit("reportsSummaryData", cachedData)
        }
      } catch (error) {
        console.error(`❌ Error handling reports summary request from ${socket.id}:`, error)
        socket.emit("reportError", { message: "Failed to fetch reports summary" })
      }
    })
  }

  setupPeriodicUpdates() {
    // Simulate location updates every 10s
    this.intervals.location = setInterval(async () => {
      try {
        // This would typically fetch and update ride locations
        // For now, we'll just emit a test update if there are clients
        if (this.clients.rides.size > 0) {
          const testRide = {
            _id: "test-ride-id",
            currentLocation: {
              lat: 12 + Math.random(),
              lng: 77 + Math.random(),
              address: "Test Location",
              updatedAt: new Date().toLocaleTimeString(),
            },
          }

          this.io.to("rides").emit("locationUpdate", {
            rideId: testRide._id,
            lat: testRide.currentLocation.lat,
            lng: testRide.currentLocation.lng,
            address: testRide.currentLocation.address,
          })
        }
      } catch (err) {
        console.error("Error updating ride locations:", err)
      }
    }, 10000)

    // Periodically send dashboard updates (every 15 seconds)
    this.intervals.dashboard = setInterval(async () => {
      try {
        if (this.clients.dashboard.size > 0) {
          await this.sendDashboardUpdates()
        }
      } catch (err) {
        console.error("Error sending dashboard updates:", err)
      }
    }, 15000)

    // Update reports summary every 5 minutes
    this.intervals.reports = setInterval(async () => {
      try {
        if (this.clients.reports.size > 0 && !this.broadcastInProgress) {
          console.log(`🔄 Periodic summary update (${this.clients.reports.size} clients)`)
          await this.broadcastReportsSummary()
        }
      } catch (error) {
        console.error("❌ Error in periodic summary update:", error)
      }
    }, 300000) // 5 minutes
  }

  async sendInitialData(socket, room) {
    try {
      switch (room) {
        case "dashboard":
          const stats = await this.getDashboardStats()
          if (stats) {
            socket.emit("dashboardStats", stats)
            console.log("📊 Initial dashboard stats sent to new client")
          }
          break

        case "admin-management":
          socket.emit("connected", {
            message: "Connected to admin management system",
            timestamp: new Date().toISOString(),
          })
          break

        case "billing":
          socket.emit("connected", {
            message: "Connected to billing system",
            timestamp: new Date().toISOString(),
          })
          break

        case "reports":
          // Send cached reports data
          const cachedSummary = this.dataCache.get("reportsSummary")
          if (cachedSummary) {
            socket.emit("reportsSummaryData", cachedSummary)
          }
          break

        // Add other rooms as needed
      }
    } catch (err) {
      console.error(`Error sending initial ${room} data:`, err)
    }
  }

  async sendDashboardUpdates() {
    try {
      const stats = await this.getDashboardStats()

      // Only emit if we have valid data
      if (stats && this.validateStatsData(stats)) {
        this.io.to("dashboard").emit("dashboardStats", stats)
        console.log("📊 Dashboard stats updated and broadcasted")
      } else {
        console.warn("⚠️ Skipping dashboard update - no valid data")
      }
    } catch (err) {
      console.error("Error sending dashboard updates:", err)
    }
  }

  async broadcastReportsSummary() {
    if (this.clients.reports.size === 0 || this.broadcastInProgress) return

    this.broadcastInProgress = true

    try {
      // This would typically call a controller method
      // For now, we'll just create some test data
      const summaryData = {
        totalEarnings: 15000 + Math.random() * 1000,
        totalRides: 500 + Math.floor(Math.random() * 50),
        timestamp: new Date().toISOString(),
      }

      this.dataCache.set("reportsSummary", summaryData)
      this.io.to("reports").emit("reportsSummaryUpdate", summaryData)
      console.log(`📊 Reports summary broadcasted to ${this.clients.reports.size} clients`)
    } catch (error) {
      console.error("❌ Error in broadcastReportsSummary:", error)
    } finally {
      this.broadcastInProgress = false
    }
  }

  async getDashboardStats() {
    try {
      // Create a mock response object to capture the data
      let statsData = null
      const mockRes = {
        json: (data) => {
          statsData = data
          return data
        },
        status: (code) => ({
          json: (data) => {
            statsData = data
            return data
          },
        }),
      }

      await dashboardController.getDashboardStats({}, mockRes)

      // Validate the data before returning
      if (this.validateStatsData(statsData)) {
        return {
          ...statsData,
          timestamp: new Date().toISOString(),
        }
      } else {
        console.warn("⚠️ Invalid dashboard stats received")
        return null
      }
    } catch (error) {
      console.error("❌ Error getting dashboard stats:", error)
      return null
    }
  }

  validateStatsData(stats) {
    if (!stats || typeof stats !== "object") {
      return false
    }

    // Check if at least some meaningful data exists
    const hasValidData =
      (stats.todayRides !== undefined && stats.todayRides >= 0) ||
      (stats.totalDrivers !== undefined && stats.totalDrivers >= 0) ||
      (stats.todayIncome !== undefined && stats.todayIncome >= 0)

    return hasValidData
  }

  registerEmitters() {
    // Make emit functions available to the app
    const emitToRoom = (room, event, data) => {
      console.log(`📡 Emitting ${event} to room ${room}:`, data)
      this.io.to(room).emit(event, data)
    }

    const emitAdminEvent = (event, data) => {
      emitToRoom("admin-management", event, {
        ...data,
        timestamp: new Date().toISOString(),
      })
    }

    const emitDashboardEvent = (event, data) => {
      emitToRoom("dashboard", event, {
        ...data,
        timestamp: new Date().toISOString(),
      })
    }

    const emitReportsEvent = (event, data) => {
      emitToRoom("reports", event, {
        ...data,
        timestamp: new Date().toISOString(),
      })
    }

    const emitBillingEvent = (event, data) => {
      emitToRoom("billing", event, {
        ...data,
        timestamp: new Date().toISOString(),
      })
    }

    const emitDriverEvent = (event, data) => {
      emitToRoom("drivers", event, {
        ...data,
        timestamp: new Date().toISOString(),
      })
    }

    // Register emitters with the app
    if (this.app) {
      this.app.set("socketEmitters", {
        emitToRoom,
        emitAdminEvent,
        emitDashboardEvent,
        emitReportsEvent,
        emitBillingEvent,
        emitDriverEvent,
        getClients: () => this.clients,
      })
    }
  }

  cleanup() {
    // Clear all intervals
    Object.values(this.intervals).forEach((interval) => clearInterval(interval))

    // Close all connections
    if (this.io) {
      this.io.close()
    }

    console.log("🧹 Socket server cleaned up")
  }
}

// Create and export singleton instance
const socketServer = new SocketServer()
module.exports = socketServer

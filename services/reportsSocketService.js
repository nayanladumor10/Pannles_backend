// Location: /services/reportsSocketService.js
// Enhanced Socket.IO service with personalized, validated broadcasts.

const reportsController = require("../controllers/reportsController")

class ReportsSocketService {
  constructor(io) {
    this.io = io
    this.connectedClients = new Map()
    this.lastDataCache = new Map()
    this.broadcastInProgress = false
    this.setupSocketHandlers()
    this.startPeriodicUpdates()
  }

  setupSocketHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`📊 Reports client connected: ${socket.id}`)
      this.connectedClients.set(socket.id, {
        socket,
        lastActivity: new Date(),
        filters: {}, // Initialize with empty filters for each client
      })

      // Send cached data immediately if available to provide a fast initial view
      this.sendCachedDataToClient(socket)

      // Handle client requesting specific report data
      socket.on("requestEarningsReport", async (params) => {
        try {
          console.log(`📊 Client ${socket.id} requesting earnings report:`, params)
          // Store the latest filters for this specific client
          if (this.connectedClients.has(socket.id)) {
            this.connectedClients.get(socket.id).filters = params
            this.connectedClients.get(socket.id).lastActivity = new Date()
          }

          const mockReq = {
            query: params || {},
            app: { get: () => this.io },
          }
          const mockRes = {
            json: (data) => {
              // Validate data before sending
              if (this.isValidData(data, "earnings")) {
                this.lastDataCache.set("earningsReport", data) // Update global cache
                socket.emit("earningsReportData", data)
                console.log(`✅ Sent earnings report to ${socket.id}`)
              } else {
                console.warn(`⚠️ Invalid earnings data, not sending to ${socket.id}`)
                const cachedData = this.lastDataCache.get("earningsReport")
                if (cachedData) {
                  socket.emit("earningsReportData", cachedData)
                }
              }
            },
            status: () => ({
              json: (error) => {
                console.error(`❌ Earnings report error for ${socket.id}:`, error)
                socket.emit("reportError", error)
              },
            }),
          }
          await reportsController.getEarningsReport(mockReq, mockRes)
        } catch (error) {
          console.error(`❌ Error handling earnings report request from ${socket.id}:`, error)
          socket.emit("reportError", { message: "Failed to fetch earnings report" })
        }
      })

      socket.on("requestDriverPerformance", async (params) => {
        try {
          console.log(`📊 Client ${socket.id} requesting driver performance:`, params)
          if (this.connectedClients.has(socket.id)) {
            this.connectedClients.get(socket.id).lastActivity = new Date()
          }

          const mockReq = {
            query: params || {},
            app: { get: () => this.io },
          }
          const mockRes = {
            json: (data) => {
              if (this.isValidData(data, "drivers")) {
                this.lastDataCache.set("driverPerformance", data)
                socket.emit("driverPerformanceData", data)
                console.log(`✅ Sent driver performance to ${socket.id}`)
              } else {
                console.warn(`⚠️ Invalid driver data, not sending to ${socket.id}`)
                const cachedData = this.lastDataCache.get("driverPerformance")
                if (cachedData) {
                  socket.emit("driverPerformanceData", cachedData)
                }
              }
            },
            status: () => ({
              json: (error) => {
                console.error(`❌ Driver performance error for ${socket.id}:`, error)
                socket.emit("reportError", error)
              },
            }),
          }
          await reportsController.getDriverPerformanceReport(mockReq, mockRes)
        } catch (error) {
          console.error(`❌ Error handling driver performance request from ${socket.id}:`, error)
          socket.emit("reportError", { message: "Failed to fetch driver performance" })
        }
      })

      socket.on("requestRidesAnalysis", async (params) => {
        try {
          console.log(`📊 Client ${socket.id} requesting rides analysis:`, params)
           if (this.connectedClients.has(socket.id)) {
            this.connectedClients.get(socket.id).lastActivity = new Date()
          }

          const mockReq = {
            query: params || {},
            app: { get: () => this.io },
          }
          const mockRes = {
            json: (data) => {
              if (this.isValidData(data, "rides")) {
                this.lastDataCache.set("ridesAnalysis", data)
                socket.emit("ridesAnalysisData", data)
                console.log(`✅ Sent rides analysis to ${socket.id}`)
              } else {
                console.warn(`⚠️ Invalid rides data, not sending to ${socket.id}`)
                const cachedData = this.lastDataCache.get("ridesAnalysis")
                if (cachedData) {
                  socket.emit("ridesAnalysisData", cachedData)
                }
              }
            },
            status: () => ({
              json: (error) => {
                console.error(`❌ Rides analysis error for ${socket.id}:`, error)
                socket.emit("reportError", error)
              },
            }),
          }
          await reportsController.getRidesAnalysisReport(mockReq, mockRes)
        } catch (error) {
          console.error(`❌ Error handling rides analysis request from ${socket.id}:`, error)
          socket.emit("reportError", { message: "Failed to fetch rides analysis" })
        }
      })

      socket.on("requestReportsSummary", async (params) => {
        try {
          console.log(`📊 Client ${socket.id} requesting reports summary`)
           if (this.connectedClients.has(socket.id)) {
            // Also store filters from summary requests if they contain a timeRange
            if (params && params.timeRange) {
                this.connectedClients.get(socket.id).filters.timeRange = params.timeRange
            }
            this.connectedClients.get(socket.id).lastActivity = new Date()
          }

          const mockReq = {
            query: params || {},
            app: { get: () => this.io },
          }
          const mockRes = {
            json: (data) => {
              if (this.isValidData(data, "summary")) {
                this.lastDataCache.set("reportsSummary", data)
                socket.emit("reportsSummaryData", data)
                console.log(`✅ Sent reports summary to ${socket.id}`)
              } else {
                console.warn(`⚠️ Invalid summary data, not sending to ${socket.id}`)
                const cachedData = this.lastDataCache.get("reportsSummary")
                if (cachedData) {
                  socket.emit("reportsSummaryData", cachedData)
                }
              }
            },
            status: () => ({
              json: (error) => {
                console.error(`❌ Reports summary error for ${socket.id}:`, error)
                socket.emit("reportError", error)
              },
            }),
          }
          await reportsController.getReportsSummary(mockReq, mockRes)
        } catch (error) {
          console.error(`❌ Error handling reports summary request from ${socket.id}:`, error)
          socket.emit("reportError", { message: "Failed to fetch reports summary" })
        }
      })

      socket.on("disconnect", () => {
        console.log(`📊 Reports client disconnected: ${socket.id}`)
        this.connectedClients.delete(socket.id)
      })

      socket.on("error", (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error)
      })
    })
  }

  isValidData(data, type) {
    if (!data || typeof data !== "object") {
      console.warn(`⚠️ Invalid ${type} data: not an object`)
      return false
    }
    switch (type) {
      case "summary":
        return data.totalEarnings !== undefined && data.totalRides !== undefined
      case "earnings":
        return data.chartData && Array.isArray(data.chartData) && data.summary
      case "drivers":
        return data.tableData && Array.isArray(data.tableData)
      case "rides":
        return data.chartData && Array.isArray(data.chartData)
      default:
        return true
    }
  }

  sendCachedDataToClient(socket) {
    try {
      const cachedSummary = this.lastDataCache.get("reportsSummary")
      const cachedEarnings = this.lastDataCache.get("earningsReport")
      const cachedDrivers = this.lastDataCache.get("driverPerformance")

      if (cachedSummary && this.isValidData(cachedSummary, "summary")) {
        socket.emit("reportsSummaryData", cachedSummary)
      }
      if (cachedEarnings && this.isValidData(cachedEarnings, "earnings")) {
        socket.emit("earningsReportData", cachedEarnings)
      }
      if (cachedDrivers && this.isValidData(cachedDrivers, "drivers")) {
        socket.emit("driverPerformanceData", cachedDrivers)
      }
    } catch (error) {
      console.error(`❌ Error sending cached data to ${socket.id}:`, error)
    }
  }

  startPeriodicUpdates() {
    setInterval(() => this.broadcastReportsSummary(), 300000) // 5 minutes
    setInterval(() => this.broadcastEarningsReport(), 600000) // 10 minutes
    setInterval(() => this.cleanupInactiveConnections(), 900000) // 15 minutes
  }

  // FIX: Broadcasts summary updates personalized for each client.
  async broadcastReportsSummary() {
    if (this.connectedClients.size === 0 || this.broadcastInProgress) return

    this.broadcastInProgress = true
    console.log(`🔄 Broadcasting personalized summary updates to ${this.connectedClients.size} clients...`)

    const updatePromises = Array.from(this.connectedClients.values()).map(async (clientData) => {
      if (!clientData.socket || !clientData.filters) return

      const mockReq = {
        query: { timeRange: clientData.filters.timeRange || 'day' },
        app: { get: () => this.io },
      }
      const mockRes = {
        json: (data) => {
          if (this.isValidData(data, "summary")) {
            clientData.socket.emit("reportsSummaryUpdate", data)
          }
        },
        status: () => ({ json: (err) => console.error(`Error for ${clientData.socket.id}`, err) }),
      }
      try {
        await reportsController.getReportsSummary(mockReq, mockRes)
      } catch (error) {
        console.error(`Error in broadcast to ${clientData.socket.id}`, error)
      }
    })
    
    try {
      await Promise.all(updatePromises)
    } finally {
      this.broadcastInProgress = false
    }
  }

  // FIX: Broadcasts earnings reports personalized for each client.
  async broadcastEarningsReport() {
    if (this.connectedClients.size === 0 || this.broadcastInProgress) return

    this.broadcastInProgress = true
    console.log(`🔄 Broadcasting personalized earnings updates to ${this.connectedClients.size} clients...`)

    const updatePromises = Array.from(this.connectedClients.values()).map(async (clientData) => {
      if (!clientData.socket || !clientData.filters || Object.keys(clientData.filters).length === 0) {
        return
      }

      const mockReq = { query: clientData.filters, app: { get: () => this.io } }
      const mockRes = {
        json: (data) => {
          // The controller already includes a `filters` object in the response.
          if (this.isValidData(data, "earnings") && data.hasData) {
            clientData.socket.emit("earningsReportUpdate", data)
          }
        },
        status: () => ({ json: (err) => console.error(`Error for ${clientData.socket.id}`, err) }),
      }
      try {
        await reportsController.getEarningsReport(mockReq, mockRes)
      } catch (error) {
        console.error(`Error in broadcast to ${clientData.socket.id}`, error)
      }
    })

    try {
      await Promise.all(updatePromises)
    } finally {
      this.broadcastInProgress = false
    }
  }

  async triggerReportsUpdate() {
    if (this.broadcastInProgress) return
    console.log(`🔄 Triggering reports update...`)
    await this.broadcastReportsSummary()
    setTimeout(() => this.broadcastEarningsReport(), 1000)
  }

  cleanupInactiveConnections() {
    const now = new Date()
    const timeout = 30 * 60 * 1000 // 30 minutes
    for (const [socketId, clientInfo] of this.connectedClients.entries()) {
      if (now - clientInfo.lastActivity > timeout) {
        console.log(`🧹 Cleaning up inactive connection: ${socketId}`)
        clientInfo.socket.disconnect(true)
        this.connectedClients.delete(socketId)
      }
    }
  }

  getStats() {
    return {
      connectedClients: this.connectedClients.size,
      cachedDataTypes: Array.from(this.lastDataCache.keys()),
      broadcastInProgress: this.broadcastInProgress,
    }
  }
}

module.exports = ReportsSocketService
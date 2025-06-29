const Ride = require("./models/Ride")
const Driver = require("./models/TRdriverModel")
const Vehicle = require("./models/Vehicle")
const dashboardController = require("./controllers/dashboardController")
const driverController = require("./controllers/driverController")
const locationSimulator = require("./utils/locationSimulator")
const dataService = require('./services/dataService')

/**
 * Unified Socket.IO setup that combines all functionality:
 * - Dashboard real-time updates
 * - Ride tracking and location updates
 * - Admin management events
 * - Reports and analytics
 * - Driver tracking and simulation
 * - Vehicle management events
 * @param {Object} io - Socket.IO server instance
 * @param {Object} app - Express app instance for accessing controllers
 */
function setupSocket(io, app) {
  // Set IO instance in data service
  dataService.setIO(io);

  // Track connected clients by type
  const clients = {
    dashboard: new Set(),
    admin: new Set(),
    rides: new Set(),
    reports: new Set(),
    drivers: new Set(),
    vehicles: new Set(),
    all: new Set(),
  }

  // Simulation intervals
  let locationInterval
  let dashboardInterval
  let driverSimulationInterval

  io.on("connection", (socket) => {
    clients.all.add(socket)
    console.log("Client connected:", socket.id)

    // Handle room joining for different features
    socket.on("join-room", async (room) => {
      socket.join(room)
      console.log(`🏠 Socket ${socket.id} joined room: ${room}`)

      // Track clients by feature type
      switch (room) {
        case "dashboard":
          clients.dashboard.add(socket)
          const dashboardData = dataService.getCachedData('dashboard')
          if (Object.keys(dashboardData).length > 0) {
            socket.emit('dashboardUpdate', {
              success: true,
              data: dashboardData,
              timestamp: new Date().toISOString()
            })
          }
          break
        case "admin-management":
          clients.admin.add(socket)
          socket.emit("connected", {
            message: "Connected to admin management system",
            timestamp: new Date().toISOString(),
          })
          break
        case "rides":
          clients.rides.add(socket)
          const ridesData = dataService.getCachedData('rides')
          if (ridesData.length > 0) {
            socket.emit('ridesUpdate', {
              success: true,
              data: ridesData,
              timestamp: new Date().toISOString()
            })
          }
          break
        case "reports":
          clients.reports.add(socket)
          break
        case "drivers":
          clients.drivers.add(socket)
          const driversData = dataService.getCachedData('drivers')
          if (driversData.length > 0) {
            socket.emit('driversUpdate', {
              success: true,
              data: driversData,
              timestamp: new Date().toISOString()
            })
          }
          break
        case "vehicles":
          clients.vehicles.add(socket)
          const vehiclesData = dataService.getCachedData('vehicles')
          if (vehiclesData.length > 0) {
            socket.emit('vehiclesUpdate', {
              success: true,
              data: vehiclesData,
              timestamp: new Date().toISOString()
            })
          }
          break
      }
    })

    // Auto-join dashboard room for backward compatibility
    socket.join("dashboard")
    clients.dashboard.add(socket)

    // Get latest vehicles
    socket.on("getLatestVehicles", async () => {
      try {
        const vehicles = await Vehicle.find().sort({ updatedAt: -1 }).populate("assignedDriver", "name phone")
        await dataService.updateAndBroadcast('vehicles', vehicles)
      } catch (error) {
        console.error("Error fetching vehicles for socket:", error)
        socket.emit("error", {
          message: "Failed to fetch vehicle data",
          error: error.message,
        })
      }
    })

    // Handle vehicle status updates
    socket.on("updateVehicleStatus", async (data) => {
      try {
        const { vehicleId, status } = data
        const vehicle = await Vehicle.findByIdAndUpdate(
          vehicleId,
          { status, updatedAt: new Date() },
          { new: true },
        ).populate("assignedDriver", "name phone")

        if (vehicle) {
          await dataService.updateAndBroadcast('vehicles', [vehicle])
          socket.emit("statusUpdateSuccess", {
            message: `Vehicle ${vehicle.registrationNumber} status updated to ${status}`,
            vehicle,
          })
        }
      } catch (error) {
        console.error("Error updating vehicle status:", error)
        socket.emit("error", {
          message: "Failed to update vehicle status",
          error: error.message,
        })
      }
    })

    // Handle vehicle assignment to driver
    socket.on("assignVehicleToDriver", async (data) => {
      try {
        const { vehicleId, driverId } = data
        const vehicle = await Vehicle.findByIdAndUpdate(
          vehicleId,
          { assignedDriver: driverId, status: "Active", updatedAt: new Date() },
          { new: true },
        ).populate("assignedDriver", "name phone")

        if (vehicle) {
          await dataService.updateAndBroadcast('vehicles', [vehicle])
          socket.emit("assignmentSuccess", {
            message: `Vehicle ${vehicle.registrationNumber} assigned to driver`,
            vehicle,
          })
        }
      } catch (error) {
        console.error("Error assigning vehicle:", error)
        socket.emit("error", {
          message: "Failed to assign vehicle",
          error: error.message,
        })
      }
    })

    // Handle chat messages
    socket.on("chatMessage", ({ rideId, message }) => {
      io.emit("chatMessage", { rideId, message })
      console.log(`💬 Chat message for ride ${rideId}:`, message)
    })

    // Handle ride status updates
    socket.on("rideStatusUpdate", async ({ rideId, status }) => {
      console.log("Broadcasting ride status update", rideId, status)
      try {
        const ride = await Ride.findByIdAndUpdate(
          rideId,
          { status, updatedAt: new Date() },
          { new: true }
        )
        if (ride) {
          await dataService.updateAndBroadcast('rides', [ride])
        }
      } catch (error) {
        console.error("Error updating ride status:", error)
        socket.emit("error", {
          message: "Failed to update ride status",
          error: error.message,
        })
      }
    })

    // Get latest drivers
    socket.on("getLatestDrivers", async () => {
      try {
        const drivers = await Driver.find().sort({ lastUpdate: -1 })
        await dataService.updateAndBroadcast('drivers', drivers)
      } catch (error) {
        console.error("Error fetching drivers for socket:", error)
        socket.emit("error", {
          message: "Failed to fetch driver data",
          error: error.message,
        })
      }
    })

    // Initialize data on connection
    socket.on("initialize", async () => {
      try {
        await dataService.refreshAllData()
      } catch (error) {
        console.error("Error initializing data:", error)
        socket.emit("error", {
          message: "Failed to initialize data",
          error: error.message,
        })
      }
    })

    // Handle disconnection
    socket.on("disconnect", () => {
      clients.all.delete(socket)
      Object.keys(clients).forEach(type => {
        if (type !== 'all') {
          clients[type].delete(socket)
        }
      })
      console.log("Client disconnected:", socket.id)
    })
  })

  // Start periodic data refresh
  setInterval(async () => {
    try {
      await dataService.refreshAllData()
    } catch (error) {
      console.error("Error in periodic data refresh:", error)
    }
  }, 30000) // Refresh every 30 seconds
}

module.exports = setupSocket
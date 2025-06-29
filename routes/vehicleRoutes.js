const express = require("express")
const vehicleRoutes = express.Router()
const vehicleController = require("../controllers/vehicleController")

// Vehicle CRUD routes
vehicleRoutes.post("/", vehicleController.addVehicle)
vehicleRoutes.get("/", vehicleController.getAllVehicles)
vehicleRoutes.get("/stats", vehicleController.getVehicleStats)
vehicleRoutes.get("/:id", vehicleController.getVehicleById)
vehicleRoutes.put("/:id", vehicleController.updateVehicle)
vehicleRoutes.delete("/:id", vehicleController.deleteVehicle)

module.exports = vehicleRoutes

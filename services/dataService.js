const Vehicle = require('../models/Vehicle');
const Driver = require('../models/TRdriverModel');
const Ride = require('../models/Ride');
const dashboardController = require('../controllers/dashboardController');

class DataService {
  constructor() {
    this.store = {
      vehicles: new Map(),
      drivers: new Map(),
      rides: new Map(),
      dashboard: {
        stats: {},
        lastUpdate: null
      }
    };
    
    this.cache = {
      vehicles: [],
      drivers: [],
      rides: [],
      dashboard: {}
    };
    
    this.io = null;
  }

  setIO(io) {
    this.io = io;
  }

  async updateAndBroadcast(type, data) {
    try {
      // Update cache
      this.cache[type] = data;
      
      // Update specific store
      if (type === 'vehicles') {
        data.forEach(vehicle => this.store.vehicles.set(vehicle._id.toString(), vehicle));
      } else if (type === 'drivers') {
        data.forEach(driver => this.store.drivers.set(driver._id.toString(), driver));
      } else if (type === 'rides') {
        data.forEach(ride => this.store.rides.set(ride._id.toString(), ride));
      } else if (type === 'dashboard') {
        this.store.dashboard = data;
        this.store.dashboard.lastUpdate = new Date();
      }

      // Broadcast to all relevant rooms
      if (this.io) {
        this.io.to(type).emit(`${type}Update`, {
          success: true,
          data: data,
          timestamp: new Date().toISOString()
        });

        // If dashboard data changed, update dashboard room
        if (type !== 'dashboard') {
          const dashboardStats = await this.getDashboardStats();
          this.io.to('dashboard').emit('dashboardUpdate', {
            success: true,
            data: dashboardStats,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error(`Error updating and broadcasting ${type}:`, error);
      throw error;
    }
  }

  async getDashboardStats() {
    try {
      const stats = await dashboardController.getStats();
      await this.updateAndBroadcast('dashboard', stats);
      return stats;
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  async refreshAllData() {
    try {
      const [vehicles, drivers, rides, dashboard] = await Promise.all([
        Vehicle.find().sort({ updatedAt: -1 }).populate('assignedDriver', 'name phone'),
        Driver.find().sort({ lastUpdate: -1 }),
        Ride.find().sort({ createdAt: -1 }),
        this.getDashboardStats()
      ]);

      await Promise.all([
        this.updateAndBroadcast('vehicles', vehicles),
        this.updateAndBroadcast('drivers', drivers),
        this.updateAndBroadcast('rides', rides),
        this.updateAndBroadcast('dashboard', dashboard)
      ]);

      return {
        vehicles,
        drivers,
        rides,
        dashboard
      };
    } catch (error) {
      console.error('Error refreshing all data:', error);
      throw error;
    }
  }

  getCachedData(type) {
    return this.cache[type] || [];
  }

  getStoredItem(type, id) {
    return this.store[type].get(id);
  }
}

// Create singleton instance
const dataService = new DataService();
module.exports = dataService; 
const Ride = require('../models/Ride1');
const Driver = require("../models/TRdriverModel")


exports.getDashboardStats = async (req, res) => {
  try {
    // Today's date range
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Yesterday's date range
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    
    const endOfYesterday = new Date(endOfToday);
    endOfYesterday.setDate(endOfYesterday.getDate() - 1);

    // Last week's date range (for driver growth)
    const startOfLastWeek = new Date(startOfToday);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    
    const endOfLastWeek = new Date(endOfYesterday);

    // Previous week's date range (for driver growth percentage)
    const startOfPreviousWeek = new Date(startOfLastWeek);
    startOfPreviousWeek.setDate(startOfPreviousWeek.getDate() - 7);
    const endOfPreviousWeek = new Date(endOfLastWeek);
    endOfPreviousWeek.setDate(endOfPreviousWeek.getDate() - 7);

    const [
      todayRides, 
      yesterdayRides,
      totalDrivers,
      newDriversThisWeek,
      newDriversLastWeek,
      ridesData,
      yesterdayRidesData
    ] = await Promise.all([

      // Today's rides count
      Ride.countDocuments({ rideTime: { $gte: startOfToday, $lte: endOfToday } }),
      
      // Yesterday's rides count
      Ride.countDocuments({ rideTime: { $gte: startOfYesterday, $lte: endOfYesterday } }),
      
      // Total active drivers
      Driver.countDocuments({ isOnline: true }),
      
      // New drivers this week
      Driver.countDocuments({ 
        joinDate: { $gte: startOfLastWeek, $lte: endOfLastWeek },
        isOnline: true 
      }),
      
      // New drivers last week (for percentage comparison)
      Driver.countDocuments({
        joinDate: { $gte: startOfPreviousWeek, $lte: endOfPreviousWeek },
        isOnline: true
      }),
      
      // Today's rides aggregation
      Ride.aggregate([
        {
          $match: { rideTime: { $gte: startOfToday, $lte: endOfToday } }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } }
          }
        }
      ]),
      
      // Yesterday's rides aggregation
      Ride.aggregate([
        {
          $match: { ridetime: { $gte: startOfYesterday, $lte: endOfYesterday } }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } }
          }
        }
      ])
    ]);

    // Helper function to calculate percentage change
    const calculatePercentageChange = (current, previous) => {
      if (previous === 0) return current === 0 ? 0 : 100; // handle division by zero
      return ((current - previous) / previous * 100).toFixed(1);
    };

    // Handle case when there are no rides
    const todayRidesData = ridesData[0] || {
      totalAmount: 0,
      completed: 0,
      cancelled: 0
    };

    const yRidesData = yesterdayRidesData[0] || {
      totalAmount: 0,
      completed: 0,
      cancelled: 0
    };

    // Calculate percentage changes
    const ridesPercentageChange = calculatePercentageChange(todayRides, yesterdayRides);
    const incomePercentageChange = calculatePercentageChange(
      todayRidesData.totalAmount, 
      yRidesData.totalAmount
    );
    const completedPercentageChange = calculatePercentageChange(
      todayRidesData.completed, 
      yRidesData.completed
    );
    const cancelledPercentageChange = calculatePercentageChange(
      todayRidesData.cancelled, 
      yRidesData.cancelled
    );
    const driversPercentageChange = calculatePercentageChange(
      newDriversThisWeek,
      newDriversLastWeek
    );

    const stats = {
      todayRides: todayRides || 0,
      ridesPercentageChange: parseFloat(ridesPercentageChange),
      totalDrivers: totalDrivers || 0,
      newDriversThisWeek: newDriversThisWeek || 0,
      driversPercentageChange: parseFloat(driversPercentageChange),
      todayIncome: (todayRidesData.totalAmount || 0).toFixed(2),
      incomePercentageChange: parseFloat(incomePercentageChange),
      completedRides: todayRidesData.completed || 0,
      completedPercentageChange: parseFloat(completedPercentageChange),
      cancelledRides: todayRidesData.cancelled || 0,
      cancelledPercentageChange: parseFloat(cancelledPercentageChange),
      successRate: todayRides > 0 
        ? parseFloat(((todayRidesData.completed / todayRides) * 100).toFixed(1)) 
        : 0,
      cancellationRate: todayRides > 0 
        ? parseFloat(((todayRidesData.cancelled / todayRides) * 100).toFixed(1)) 
        : 0
    };

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getRecentRides = async (req, res) => {
  try {
    const rides = await Ride.find()
      .sort({ time: -1 })
      .limit(10)
      .populate('user', 'name')
      .populate('driver', 'name');

    res.json(rides);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getRevenueData = async (req, res) => {
  try {
    // Get last 7 days data including today
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6); // Last 7 days including today
    startDate.setHours(0, 0, 0, 0);

    // Generate all dates in the range for labels
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dateArray = [];
    const labels = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dateArray.push(date);
      labels.push(dayNames[date.getDay()]);
    }

    // Query for completed rides in this period
    const revenueData = await Ride.aggregate([
      {
        $match: {
          rideTime: { // Changed from 'time' to 'rideTime' to match your schema
            $gte: startDate,
            $lte: endDate
          },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$rideTime" // Changed from 'time' to 'rideTime'
            }
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id": 1 } // Sort by date ascending
      }
    ]);

    // Create a complete dataset with all days, including zeros for missing days
    const data = dateArray.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      const dayData = revenueData.find(item => item._id === dateStr);
      return dayData ? dayData.totalAmount : 0;
    });

    res.json({
      labels,
      data
    });
  } catch (err) {
    console.error('Error in getRevenueData:', err);
    res.status(500).json({ 
      message: 'Server Error',
      error: err.message 
    });
  }
};

exports.getServiceDistribution = async (req, res) => {
  try {
    const distribution = await Ride.aggregate([
      {
        $group: {
          _id: "$service",
          count: { $sum: 1 }
        }
      }
    ]);

    // Format the data for the frontend
    const result = {
      labels: [],
      data: []
    };

    distribution.forEach(item => {
      result.labels.push(item._id);
      result.data.push(item.count);
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};
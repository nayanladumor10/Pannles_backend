// Location: /utils/reportsHelper.js
// Helper functions for reports calculations and data formatting

const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 1000) / 10
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

const formatPercentage = (value) => {
  return Math.round((value || 0) * 10) / 10
}

const generateDateRange = (startDate, endDate, timeRange) => {
  const dates = []
  let current = new Date(startDate)

  while (current <= endDate) {
    const dateCopy = new Date(current)
    if (timeRange === "day") {
      for (let hour = 0; hour < 24; hour++) {
        dates.push({
          key: hour.toString().padStart(2, "0"),
          label: `${hour}:00`,
          date: new Date(dateCopy.getFullYear(), dateCopy.getMonth(), dateCopy.getDate(), hour),
        })
      }
      break // Only one day for hourly breakdown
    } else {
      dates.push({
        key: dateCopy.toISOString().split("T")[0],
        label: dateCopy.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        date: new Date(dateCopy),
      })
      current.setDate(current.getDate() + 1)
    }
  }

  return dates
}

const fillMissingDataPoints = (data, dateRange, defaultValue = 0) => {
  return dateRange.map((datePoint) => {
    const existingData = data.find((item) => item._id === datePoint.key)
    return {
      name: datePoint.label,
      ...existingData,
      earnings: existingData?.totalEarnings ?? defaultValue,
      rides: existingData?.totalRides ?? defaultValue,
      cancellations: existingData?.cancelledRides ?? defaultValue,
    }
  })
}

const aggregateServiceData = (rides) => {
  const serviceMap = {}

  rides.forEach((ride) => {
    if (!serviceMap[ride.service]) {
      serviceMap[ride.service] = {
        count: 0,
        earnings: 0,
        completedRides: 0,
      }
    }

    serviceMap[ride.service].count++
    if (ride.status === "completed") {
      serviceMap[ride.service].earnings += ride.amount || 0
      serviceMap[ride.service].completedRides++
    }
  })

  return Object.entries(serviceMap).map(([service, data]) => ({
    service,
    ...data,
    avgEarningPerRide:
      data.completedRides > 0
        ? Math.round((data.earnings / data.completedRides) * 100) / 100
        : 0,
  }))
}

const calculateDriverRankings = (drivers) => {
  return drivers
    .map((driver) => ({
      ...driver,
      score:
        (driver.completionRate || 0) * 0.4 +
        (driver.totalEarnings || 0) * 0.0001 +
        (driver.totalRides || 0) * 0.1,
    }))
    .sort((a, b) => b.score - a.score)
    .map((driver, index) => ({
      ...driver,
      rank: index + 1,
    }))
}

module.exports = {
  calculatePercentageChange,
  formatCurrency,
  formatPercentage,
  generateDateRange,
  fillMissingDataPoints,
  aggregateServiceData,
  calculateDriverRankings,
}

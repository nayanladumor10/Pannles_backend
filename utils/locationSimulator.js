// City bounds for realistic simulation (can be any city)
const CITY_BOUNDS = {
  north: 24.9265,
  south: 24.7453,
  east: 67.1577,
  west: 66.975,
}

// Generate random location within city bounds
const generateRandomLocation = () => {
  const lat = CITY_BOUNDS.south + Math.random() * (CITY_BOUNDS.north - CITY_BOUNDS.south)
  const lng = CITY_BOUNDS.west + Math.random() * (CITY_BOUNDS.east - CITY_BOUNDS.west)
  return { lat, lng }
}

// Simulate realistic movement for a driver
const simulateMovement = (currentLocation, status, speed = 0) => {
  // If no current location, generate a random one
  if (!currentLocation || !currentLocation.lat || !currentLocation.lng) {
    const newLocation = generateRandomLocation()
    return { location: newLocation, speed: Math.floor(Math.random() * 60) }
  }

  // If driver is not active, don't move much
  if (status !== "active") {
    // Small random movement to simulate GPS drift
    const lat = currentLocation.lat + (Math.random() - 0.5) * 0.0005
    const lng = currentLocation.lng + (Math.random() - 0.5) * 0.0005
    return {
      location: { lat, lng },
      speed: status === "idle" ? 0 : Math.floor(Math.random() * 5),
    }
  }

  // Active drivers move more
  const movementFactor = 0.001 // Larger movement
  const lat = currentLocation.lat + (Math.random() - 0.5) * movementFactor
  const lng = currentLocation.lng + (Math.random() - 0.5) * movementFactor

  // Calculate new speed with some variation
  const newSpeed =
    speed > 0 ? Math.max(5, Math.min(80, speed + (Math.random() - 0.5) * 10)) : Math.floor(Math.random() * 60) + 20

  return { location: { lat, lng }, speed: newSpeed }
}

// Calculate distance between two points (in kilometers)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371 // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c // Distance in km
  return distance
}

// Generate realistic ETA based on distance and traffic
const generateETA = (distance, currentSpeed = 40) => {
  // Add some randomness to simulate traffic conditions
  const trafficFactor = 0.8 + Math.random() * 0.4 // 0.8 to 1.2

  // Calculate time in minutes
  const timeInHours = (distance / currentSpeed) * trafficFactor
  const timeInMinutes = Math.ceil(timeInHours * 60)

  return `${timeInMinutes} mins`
}

// Simulate battery drain based on activity
const simulateBatteryDrain = (currentBattery, status, speed) => {
  if (!currentBattery && currentBattery !== 0) {
    return Math.floor(Math.random() * 100) // Random battery if none provided
  }

  // Different drain rates based on status
  let drainRate = 0

  switch (status) {
    case "active":
      drainRate = 0.05 + speed / 1000 // Higher speed = higher drain
      break
    case "idle":
      drainRate = 0.01 // Very slow drain when idle
      break
    case "emergency":
      drainRate = 0.1 // Higher drain during emergency
      break
    default:
      drainRate = 0.02 // Default drain rate
  }

  // Apply the drain
  const newBattery = Math.max(0, Math.min(100, currentBattery - drainRate))
  return newBattery
}

// Generate random Indian destinations
const getRandomDestination = () => {
  const destinations = [
    "Andheri East",
    "Bandra West",
    "Powai",
    "Malad West",
    "Thane East",
    "Goregaon East",
    "Juhu Beach",
    "Dadar",
    "Worli",
    "Colaba",
    "Navi Mumbai",
    "Borivali",
    "Chembur",
    "Ghatkopar",
    "Versova",
    "Lokhandwala",
    "Santacruz",
    "Vile Parle",
    "Kurla",
    "Lower Parel",
  ]

  return destinations[Math.floor(Math.random() * destinations.length)]
}

// Generate random Indian passenger names
const getRandomPassenger = () => {
  const names = [
    "Priya Sharma",
    "Rahul Gupta",
    "Sneha Patel",
    "Amit Verma",
    "Kavya Joshi",
    "Ravi Agarwal",
    "Neha Singh",
    "Vikram Mehta",
    "Pooja Reddy",
    "Arjun Kumar",
    "Divya Nair",
    "Sanjay Patel",
    "Ananya Desai",
    "Rajesh Khanna",
    "Meera Iyer",
    "Kiran Rao",
    "Deepak Sharma",
    "Anjali Gupta",
    "Suresh Menon",
    "Nandini Kapoor",
  ]

  return names[Math.floor(Math.random() * names.length)]
}

module.exports = {
  generateRandomLocation,
  simulateMovement,
  calculateDistance,
  generateETA,
  simulateBatteryDrain,
  getRandomDestination,
  getRandomPassenger,
  CITY_BOUNDS,
}

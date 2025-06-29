// Helper utility for handling dynamic file uploads
const processSubDriverFiles = (files, subDriversData) => {
  const processedSubDrivers = []

  if (!subDriversData || !Array.isArray(subDriversData)) {
    return processedSubDrivers
  }

  subDriversData.forEach((subDriver, index) => {
    const subDriverFiles = {}

    // Find files for this specific sub-driver
    files.forEach((file) => {
      if (file.fieldname.startsWith(`subDriver_${index}_`)) {
        const docType = file.fieldname.split("_")[2]
        subDriverFiles[docType] = file.path
      }
    })

    processedSubDrivers.push({
      ...subDriver,
      documents: subDriverFiles,
    })
  })

  return processedSubDrivers
}

const validateSubDriverDocuments = (subDrivers) => {
  const errors = []

  subDrivers.forEach((subDriver, index) => {
    if (!subDriver.name?.trim()) {
      errors.push(`Sub-driver ${index + 1}: Name is required`)
    }
    if (!subDriver.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subDriver.email)) {
      errors.push(`Sub-driver ${index + 1}: Valid email is required`)
    }
    if (!subDriver.phone?.trim()) {
      errors.push(`Sub-driver ${index + 1}: Phone is required`)
    }
  })

  return errors
}

module.exports = {
  processSubDriverFiles,
  validateSubDriverDocuments,
}

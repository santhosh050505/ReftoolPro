const pressureService = require('../services/pressureConversionService');

/**
 * Handles the pressure conversion request.
 * Expected body: { pressureValue, altitude, altitudeUnit, pressureUnit, mode }
 */
const convertPressure = async (req, res) => {
  try {
    const { pressureValue, altitude, altitudeUnit, pressureUnit, mode } = req.body;

    // Validation
    if (pressureValue === undefined || altitude === undefined || !altitudeUnit || !pressureUnit || !mode) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: pressureValue, altitude, altitudeUnit, pressureUnit, mode'
      });
    }

    const result = pressureService.convert({
      pressureValue,
      altitude,
      altitudeUnit,
      pressureUnit,
      mode
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[PressureController] Conversion error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Returns the status of the pressure service (whether Excel is loaded).
 */
const getServiceStatus = (req, res) => {
  res.json({
    success: true,
    isLoaded: pressureService.isLoaded,
    filePath: pressureService.filePath
  });
};

/**
 * Returns all altitude data rows from the Excel.
 */
const getAltitudeData = (req, res) => {
  try {
    const data = pressureService.getAllData();
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  convertPressure,
  getServiceStatus,
  getAltitudeData
};

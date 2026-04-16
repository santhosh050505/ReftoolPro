// backend/controllers/refrigerantController.js
const calculationService = require('../services/calculationService');
const syncService = require('../services/syncService');

// List of all available refrigerants
const REFRIGERANTS = [
  'R11', 'R12', 'R13', 'R13B1', 'R14', 'R22', 'R23', 'R32', 'R41', 'R114',
  'R123', 'R1150 (Ethylene)', 'R1233zd(E)', 'R1234yf', 'R1234ze(E)', 'R124', 'R125',
  'R1270 (Propylene)', 'R1336mzz(Z)', 'R134a', 'R141b', 'R142b', 'R152a', 'R170 (Ethane)',
  'R227ea', 'R236ea', 'R236fa', 'R245fa', 'R290 (Propane)', 'R401A', 'R401B',
  'R402A', 'R402B', 'R403B', 'R404A', 'R406A', 'R407A', 'R407B', 'R407C',
  'R407F', 'R407H', 'R408A', 'R409A', 'R409B', 'R410A', 'R413A', 'R414B',
  'R416A', 'R417A', 'R417C', 'R420A', 'R421A', 'R422A', 'R422B', 'R422C',
  'R422D', 'R424A', 'R426A', 'R427A', 'R428A', 'R434A', 'R436A', 'R436B',
  'R436C', 'R437A', 'R438A', 'R441A', 'R442A', 'R443A', 'R444A', 'R444B',
  'R445A', 'R448A', 'R449A', 'R449B', 'R450A', 'R452A', 'R452B', 'R453A',
  'R454A', 'R454B', 'R454C', 'R455A', 'R458A', 'R466A', 'R469A', 'R470A',
  'R470B', 'R471A', 'R472A', 'R472B', 'R473A', 'R50 (Methane)', 'R500', 'R502',
  'R503', 'R507', 'R508B', 'R511A', 'R513A', 'R513B', 'R514A', 'R515A',
  'R515B', 'R516A', 'R600 (Butane)', 'R600a', 'R601 (Pentane)',
  'R601a (Isopentane)', 'R702 (Hydrogen)', 'R717 (Ammonia)',
  'R718 (Water)', 'R723', 'R728 (Nitrogen)', 'R729 (Air)', 'R732 (Oxygen)',
  'R744 (Carbon dioxide)', 'R744A (Nitrous oxide)', 'RE170 (Dimethyl ether)'
];

// Get refrigerant metadata (limits, available modes)
const getMetadata = async (req, res) => {
  try {
    const { refrigerant, pressureUnit, temperatureUnit } = req.query;

    const result = await calculationService.getRefrigerantMetadata(
      refrigerant || 'r12',
      pressureUnit || 'psi',
      temperatureUnit || 'celsius'
    );

    res.json(result);
  } catch (error) {
    console.error('Controller Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Calculate pressure from temperature
const calculatePressure = async (req, res) => {
  try {
    const result = await calculationService.calculatePressureFromTemp(req.body);

    res.json(result);
  } catch (error) {
    console.error('Controller Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Calculate temperature from pressure
const calculateTemperature = async (req, res) => {
  try {
    const result = await calculationService.calculateTempFromPressure(req.body);

    res.json(result);
  } catch (error) {
    console.error('Controller Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get slider data
const getSliderData = async (req, res) => {
  try {
    const result = await calculationService.getSliderData(req.body);

    res.json(result);
  } catch (error) {
    console.error('Controller Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get list of refrigerants
const list = async (req, res) => {
  try {
    res.json({
      success: true,
      refrigerants: REFRIGERANTS
    });
  } catch (error) {
    console.error('Controller Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get range data for a specific refrigerant
 */
const getRanges = async (req, res) => {
  try {
    const { refrigerant } = req.params;

    // Fetch ranges directly from Danfoss API via calculationService
    const result = await calculationService.getFullRefrigerantRanges(refrigerant);

    if (!result || !result.ranges) {
      return res.status(404).json({
        success: false,
        error: `Range data not found for refrigerant: ${refrigerant}`
      });
    }

    res.json({
      success: true,
      refrigerant: refrigerant,
      ranges: result.ranges
    });
  } catch (error) {
    console.error('Controller Error (getRanges):', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * ADMIN: Get all refrigerants from JSON file with full data including GWP values and range data
 */
const getAllRefrigerants = async (req, res) => {
  try {
    const jsonFileService = require('../services/jsonFileService');
    const refrigerants = jsonFileService.getAllRefrigerants();

    // Enrich each refrigerant with its range data
    const enrichedRefrigerants = refrigerants.map(ref => {
      const rangeData = jsonFileService.getRangeData(ref.name);

      // Extract basic range values in bar and celsius
      let minPressure = '';
      let maxPressure = '';
      let minTemperature = '';
      let maxTemperature = '';

      if (rangeData) {
        // Extract from bar pressure values
        if (rangeData.pressure_absolute && rangeData.pressure_absolute.bar) {
          minPressure = rangeData.pressure_absolute.bar.min || '';
          maxPressure = rangeData.pressure_absolute.bar.max || '';
        }

        // Extract from Celsius temperature values
        if (rangeData.temperature && rangeData.temperature.C) {
          minTemperature = rangeData.temperature.C.min || '';
          maxTemperature = rangeData.temperature.C.max || '';
        }
      }

      return {
        ...ref,
        minPressure,
        maxPressure,
        minTemperature,
        maxTemperature
      };
    });

    res.json({
      success: true,
      count: enrichedRefrigerants.length,
      refrigerants: enrichedRefrigerants
    });
  } catch (error) {
    console.error('Controller Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const addRefrigerant = async (req, res) => {
  try {
    const jsonFileService = require('../services/jsonFileService');
    const rangeConversionService = require('../services/rangeConversionService');

    const {
      name,
      gwp_ar4,
      gwpAR4,
      gwp_ar5,
      gwpAR5,
      gwp_ar6,
      gwpAR6,
      minPressure,
      maxPressure,
      minTemperature,
      maxTemperature,
      ...restOfData
    } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: name'
      });
    }

    const gAR4 = gwp_ar4 !== undefined ? gwp_ar4 : gwpAR4;
    const gAR5 = gwp_ar5 !== undefined ? gwp_ar5 : gwpAR5;
    const gAR6 = gwp_ar6 !== undefined ? gwp_ar6 : gwpAR6;

    const filteredData = {};
    for (const [key, value] of Object.entries(restOfData)) {
      if (value !== '' && value !== null && value !== undefined) {
        filteredData[key] = value;
      }
    }

    const newRefrigerantData = {
      name,
      rNumber: name
    };

    if (gAR4 !== undefined && gAR4 !== '' && gAR4 !== null) newRefrigerantData.gwpAR4 = gAR4;
    if (gAR5 !== undefined && gAR5 !== '' && gAR5 !== null) newRefrigerantData.gwpAR5 = gAR5;
    if (gAR6 !== undefined && gAR6 !== '' && gAR6 !== null) newRefrigerantData.gwpAR6 = gAR6;

    Object.assign(newRefrigerantData, filteredData);

    let rangeData = null;
    if (minPressure && maxPressure && minTemperature && maxTemperature) {
      const rangeResult = rangeConversionService.processAndStore(
        name,
        minPressure,
        maxPressure,
        minTemperature,
        maxTemperature
      );

      if (rangeResult.success) {
        rangeData = rangeResult.data;
      }
    }

    const newRefrigerant = jsonFileService.addRefrigerant(newRefrigerantData);
    await syncService.syncAll();

    res.json({
      success: true,
      message: `Refrigerant "${name}" added successfully - Data synced to frontend`,
      refrigerant: newRefrigerant
    });
  } catch (error) {
    console.error('Add Refrigerant Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to add refrigerant: ' + error.message
    });
  }
};

const updateRefrigerant = async (req, res) => {
  try {
    const jsonFileService = require('../services/jsonFileService');
    const rangeConversionService = require('../services/rangeConversionService');
    const { id } = req.params;
    let updates = req.body;

    const {
      minPressure,
      maxPressure,
      minTemperature,
      maxTemperature,
      ...otherUpdates
    } = updates;

    const filteredUpdates = {};
    for (const [key, value] of Object.entries(otherUpdates)) {
      if (value !== '' && value !== null && value !== undefined) {
        if (key === 'gwp_ar4') {
          filteredUpdates['gwpAR4'] = value;
        } else if (key === 'gwp_ar5') {
          filteredUpdates['gwpAR5'] = value;
        } else if (key === 'gwp_ar6') {
          filteredUpdates['gwpAR6'] = value;
        } else {
          filteredUpdates[key] = value;
        }
      }
    }

    let rangeData = null;
    if (minPressure && maxPressure && minTemperature && maxTemperature) {
      const rangeResult = rangeConversionService.processAndStore(
        id,
        minPressure,
        maxPressure,
        minTemperature,
        maxTemperature
      );

      if (rangeResult.success) {
        rangeData = rangeResult.data;
      }
    }

    const updated = jsonFileService.updateRefrigerant(id, filteredUpdates);
    await syncService.syncAll();

    res.json({
      success: true,
      message: `Refrigerant "${id}" updated successfully - Data synced to frontend`,
      refrigerant: updated
    });
  } catch (error) {
    console.error('Update Refrigerant Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update refrigerant: ' + error.message
    });
  }
};

const deleteRefrigerant = async (req, res) => {
  try {
    const jsonFileService = require('../services/jsonFileService');
    const { id } = req.params;

    const deleted = jsonFileService.deleteRefrigerant(id);
    await syncService.syncAll();

    res.json({
      success: true,
      message: `Refrigerant "${id}" deleted successfully - Data synced to frontend`,
      refrigerant: deleted
    });
  } catch (error) {
    console.error('Delete Refrigerant Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete refrigerant: ' + error.message
    });
  }
};

module.exports = {
  calculatePressure,
  calculateTemperature,
  getSliderData,
  list,
  getRanges,
  getMetadata,
  getAllRefrigerants,
  addRefrigerant,
  updateRefrigerant,
  deleteRefrigerant
};
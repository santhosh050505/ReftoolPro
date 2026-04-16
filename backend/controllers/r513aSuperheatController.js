const r513aService = require('../services/r513aSuperheatService');

/**
 * Get R513A superheat properties by pressure and temperature
 * GET /api/r513a/superheat?pressure=13&temperature=50
 */
exports.getSuperheatProperties = (req, res) => {
    try {
        const { pressure, temperature } = req.query;
        
        if (!pressure || !temperature) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required parameters: pressure and temperature'
            });
        }
        
        const result = r513aService.getSuperheatProperties(
            parseFloat(pressure),
            parseFloat(temperature)
        );
        
        res.json(result);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

/**
 * Get R513A superheat properties with interpolation
 * GET /api/r513a/superheat/interpolated?pressure=13&temperature=52
 */
exports.getSuperheatPropertiesInterpolated = (req, res) => {
    try {
        const { pressure, temperature } = req.query;
        
        if (!pressure || !temperature) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required parameters: pressure and temperature'
            });
        }
        
        const result = r513aService.getSuperheatPropertiesInterpolated(
            parseFloat(pressure),
            parseFloat(temperature)
        );
        
        res.json(result);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

/**
 * Get available pressures
 * GET /api/r513a/superheat/pressures
 */
exports.getAvailablePressures = (req, res) => {
    try {
        const pressures = r513aService.getAvailablePressures();
        
        res.json({
            status: 'success',
            count: pressures.length,
            pressures: pressures
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

/**
 * Get available temperatures for a pressure
 * GET /api/r513a/superheat/temperatures?pressure=13
 */
exports.getAvailableTemperatures = (req, res) => {
    try {
        const { pressure } = req.query;
        
        if (!pressure) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required parameter: pressure'
            });
        }
        
        const temperatures = r513aService.getAvailableTemperatures(parseFloat(pressure));
        
        if (temperatures.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: `Pressure ${pressure} bar not found`
            });
        }
        
        res.json({
            status: 'success',
            pressure: parseFloat(pressure),
            count: temperatures.length,
            temperatures: temperatures
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

/**
 * Get complete superheat table for a pressure
 * GET /api/r513a/superheat/table?pressure=13
 */
exports.getSuperheatTable = (req, res) => {
    try {
        const { pressure } = req.query;
        
        if (!pressure) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required parameter: pressure'
            });
        }
        
        const result = r513aService.getSuperheatTableByPressure(parseFloat(pressure));
        
        if (result.status === 'error') {
            return res.status(404).json(result);
        }
        
        res.json(result);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const r513aSaturationService = require('../services/r513aSaturationService');

/**
 * Get available temperature range
 * GET /api/r513a/saturation/temp-range
 */
exports.getTemperatureRange = (req, res) => {
    try {
        const result = r513aSaturationService.getAvailableTemperatureRange();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

/**
 * Get saturation properties at temperature
 * GET /api/r513a/saturation/properties?temperature=50
 */
exports.getSaturationProperties = (req, res) => {
    try {
        const { temperature } = req.query;
        
        if (!temperature) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required parameter: temperature'
            });
        }
        
        const result = r513aSaturationService.getSaturationPropertiesInterpolated(
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
 * Get complete saturation table
 * GET /api/r513a/saturation/table
 */
exports.getSaturationTable = (req, res) => {
    try {
        const result = r513aSaturationService.getFullSaturationTable();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

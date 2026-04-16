const { spawn } = require('child_process');
const path = require('path');
const { convertToCelsius } = require('../utils/unitConverter');

const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'coolprop_mixture_cycle.py');
const BATCH_SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'coolprop_batch_props.py');

/**
 * Spawn the CoolProp mixture-cycle Python script and return a Promise
 * that resolves with the parsed JSON result.
 */
function runMixtureCycle(params) {
    return new Promise((resolve, reject) => {
        const proc = spawn('python', [SCRIPT_PATH]);
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', d => { stdout += d.toString(); });
        proc.stderr.on('data', d => { stderr += d.toString(); });

        proc.on('close', code => {
            if (code !== 0) {
                return reject(new Error(`Python process exited ${code}: ${stderr}`));
            }
            try {
                const result = JSON.parse(stdout);
                if (result.status === 'error') {
                    return reject(new Error(result.message));
                }
                resolve(result);
            } catch (e) {
                reject(new Error(`JSON parse error: ${e.message}. Raw: ${stdout}`));
            }
        });

        proc.stdin.write(JSON.stringify(params));
        proc.stdin.end();
    });
}

/**
 * Calculate R513A 4-point cycle for plotting via CoolProp mixture calculation.
 * POST /api/r513a/cycle/plot
 * Body: { sct, set, dischargeTempRef, suctionTempRef, liquidTempRef,
 *         pressureUnit, temperatureUnit, isAbsolute }
 */
exports.calculateCyclePlottingPoints = async (req, res) => {
    try {
        const {
            sct,
            set,
            dischargeTempRef,
            suctionTempRef,
            liquidTempRef,
            temperatureUnit = 'celsius',
        } = req.body;

        if (sct === undefined || set === undefined) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required parameters: sct and set'
            });
        }

        // Normalise all temperatures to Celsius
        const sctC = convertToCelsius(parseFloat(sct), temperatureUnit);
        const setC = convertToCelsius(parseFloat(set), temperatureUnit);
        const dischargeC = dischargeTempRef != null
            ? convertToCelsius(parseFloat(dischargeTempRef), temperatureUnit)
            : sctC + 20;
        const suctionC = suctionTempRef != null
            ? convertToCelsius(parseFloat(suctionTempRef), temperatureUnit)
            : setC + 5;
        const liquidC = liquidTempRef != null
            ? convertToCelsius(parseFloat(liquidTempRef), temperatureUnit)
            : sctC;

        // Basic sanity check
        if (setC >= sctC) {
            return res.status(400).json({
                status: 'validation_error',
                errors: ['SET must be lower than SCT'],
                temperatureRange: { min: -60, max: 90 }
            });
        }

        const result = await runMixtureCycle({
            refrigerant: 'R513A',
            sct: sctC,
            set: setC,
            dischargeTempRef: dischargeC,
            suctionTempRef: suctionC,
            liquidTempRef: liquidC
        });

        res.json(result);

    } catch (error) {
        console.error('[R513A CoolProp] cycle calc error:', error.message);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

/**
 * Batch point-property lookup via CoolProp mixture.
 * POST /api/r513a/point-props
 * Body: { points: [{p: <bar>, t: <°C>}, ...] }
 * Returns: { results: [{h, s, d}, ...] }
 */
exports.calculateBatchPointProps = async (req, res) => {
    try {
        const { points } = req.body;

        if (!Array.isArray(points) || points.length === 0) {
            return res.status(400).json({ status: 'error', message: 'points must be a non-empty array of {p, t}' });
        }

        const result = await new Promise((resolve, reject) => {
            const proc = spawn('python', [BATCH_SCRIPT_PATH]);
            let stdout = '', stderr = '';
            proc.stdout.on('data', d => { stdout += d.toString(); });
            proc.stderr.on('data', d => { stderr += d.toString(); });
            proc.on('close', code => {
                if (code !== 0) return reject(new Error(`Batch props process exited ${code}: ${stderr}`));
                try {
                    const r = JSON.parse(stdout);
                    if (r.status === 'error') return reject(new Error(r.message));
                    resolve(r);
                } catch (e) {
                    reject(new Error(`JSON parse error: ${e.message}`));
                }
            });
            proc.stdin.write(JSON.stringify({ refrigerant: 'R513A', points }));
            proc.stdin.end();
        });

        res.json(result);
    } catch (error) {
        console.error('[R513A CoolProp] batch props error:', error.message);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

/**
 * Validate cycle inputs
 * POST /api/r513a/cycle/validate
 */
exports.validateCycleInputs = (req, res) => {
    try {
        const { sct, set } = req.body;
        const errors = [];
        const minTemp = -60, maxTemp = 90;

        const sctV = parseFloat(sct);
        const setV = parseFloat(set);

        if (isNaN(sctV) || sctV < minTemp || sctV > maxTemp) errors.push(`SCT must be between ${minTemp} and ${maxTemp}°C`);
        if (isNaN(setV) || setV < minTemp || setV > maxTemp) errors.push(`SET must be between ${minTemp} and ${maxTemp}°C`);
        if (!isNaN(sctV) && !isNaN(setV) && setV >= sctV) errors.push('SET must be lower than SCT');

        res.json({
            status: errors.length > 0 ? 'invalid' : 'valid',
            errors,
            temperatureRange: { min: minTemp, max: maxTemp }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const r513aSuperheatService = require('./r513aSuperheatService');
const r513aSaturationService = require('./r513aSaturationService');

/**
 * Calculate R513A 4-Point Thermodynamic Cycle for Plotting
 * STRICT LOOKUP MODE (No Interpolation)
 * 
 * @param {number} sct - Saturated Condenser Temperature (°C)
 * @param {number} set - Saturated Evaporator Temperature (°C)
 * @param {number} dischargeTempRef - Discharge gas temperature (°C)
 * @param {number} suctionTempRef - Suction gas temperature (°C)
 * @param {number} liquidTempRef - Liquid temperature after condenser (°C)
 * 
 * @returns {object} 4-point cycle with properties for plotting on P-H diagram
 */
function calculateR513ACyclePlottingPoints(sct, set, dischargeTempRef, suctionTempRef, liquidTempRef) {
    try {
        // Use provided liquid temperature or default to SCT
        const liquidTemp = liquidTempRef !== undefined ? liquidTempRef : sct;

        // Step 1: Get Saturation Pressures at SCT and SET
        const satPressSCT = r513aSaturationService.getSaturationPressure(sct);
        const satPressSET = r513aSaturationService.getSaturationPressure(set);

        if (!satPressSCT || !satPressSET) {
            return {
                status: 'error',
                message: 'Invalid SCT or SET temperature (not found in saturation table)',
                details: {
                    sctFound: !!satPressSCT,
                    setFound: !!satPressSET
                }
            };
        }

        const P_sat_SCT = satPressSCT.vapor_bar;
        const P_sat_SET = satPressSET.vapor_bar;

        // POINT 1: CONDENSER INLET (Discharge Gas)
        // User Requirement: Search data using SCT, but plot using dischargeTempRef
        let p1_lookup = r513aSuperheatService.getSuperheatPropertiesNearest(P_sat_SCT, dischargeTempRef);
        let p1_source = p1_lookup ? `Superheat Table @ P=${p1_lookup.pressure} bar, T_lookup=${dischargeTempRef}°C` : 'Not Found';
        let p1_props = null;

        if (p1_lookup) {
            p1_props = {
                specificVolume_m3_per_kg: p1_lookup.properties.V,
                density_kg_per_m3: p1_lookup.properties.D,
                enthalpy_kj_per_kg: p1_lookup.properties.H,
                entropy_J_per_kgK: p1_lookup.properties.S,
                status: 'exact'
            };
        } else {
            // Fallback to Saturated Vapor at SCT if superheat lookup fails
            const p1_sat = r513aSaturationService.getVaporProperties(sct);
            if (p1_sat) {
                p1_props = {
                    specificVolume_m3_per_kg: p1_sat.specificVolume_m3_per_kg,
                    density_kg_per_m3: p1_sat.density_kg_per_m3,
                    enthalpy_kj_per_kg: p1_sat.enthalpy_kj_per_kg,
                    entropy_J_per_kgK: p1_sat.entropy_J_per_kgK,
                    status: 'saturated-fallback'
                };
                p1_source = p1_sat.source + ` (Plot T=${dischargeTempRef}°C)`;
            }
        }

        const point1 = {
            name: 'Condenser Inlet (Discharge Gas)',
            type: 'discharge',
            temperature: dischargeTempRef, // Plot Y
            pressure: P_sat_SCT,           // Plot X
            saturationTemp: sct,
            source: p1_source,
            properties: p1_props,
            error: !p1_props ? `No data for SCT=${sct}°C at P=${P_sat_SCT} bar` : null
        };

        // POINT 2: CONDENSER OUTLET (Liquid)
        // User Requirement: Search data using liquidTemp, but keep pressure corresponding to sat temperature
        const p2_lookup = r513aSaturationService.getLiquidProperties(liquidTemp);

        const point2 = {
            name: 'Condenser Outlet (Liquid)',
            type: 'liquid',
            temperature: liquidTemp, // Plot Y: actual liquid temperature
            pressure: satPressSCT.liquid_bar, // Plot X: pressure corresponding to SCT
            saturationTemp: sct,
            source: p2_lookup ? (p2_lookup.source + ` (P from SCT=${sct}°C, Props from T=${liquidTemp}°C)`) : 'Not Found',
            properties: p2_lookup ? {
                specificVolume_m3_per_kg: null,
                density_kg_per_m3: p2_lookup.density_kg_per_m3,
                enthalpy_kj_per_kg: p2_lookup.enthalpy_kj_per_kg,
                entropy_J_per_kgK: p2_lookup.entropy_J_per_kgK,
                status: 'exact'
            } : null,
            error: !p2_lookup ? `No liquid data for Liquid Temp=${liquidTemp}°C` : null
        };

        // POINT 3: EVAPORATOR INLET (Flash Mix)
        // Lookup Rule: Saturation table (Average) at SET
        // Note: For thermodynamic consistency, enthalpy should match Point 2 (Isenthalpic)
        const p3_lookup = r513aSaturationService.getAverageProperties(set);

        const point3 = {
            name: 'Evaporator Inlet (Flash Mix)',
            type: 'average',
            temperature: set, // Plot Y
            pressure: satPressSET.vapor_bar, // Plot X
            saturationTemp: set,
            source: p3_lookup ? `${p3_lookup.source} (Enthalpy matched to p2)` : 'Not Found',
            properties: p3_lookup ? {
                specificVolume_m3_per_kg: null,
                density_kg_per_m3: p3_lookup.density_kg_per_m3,
                enthalpy_kj_per_kg: p2_lookup ? p2_lookup.enthalpy_kj_per_kg : p3_lookup.enthalpy_kj_per_kg,
                entropy_J_per_kgK: p3_lookup.entropy_J_per_kgK,
                status: 'exact'
            } : null,
            error: !p3_lookup ? `No average data for SET=${set}°C` : null
        };

        // POINT 4: EVAPORATOR OUTLET (Suction Gas)
        // User Requirement: Search data using SET, but plot using suctionTempRef
        let p4_lookup = r513aSuperheatService.getSuperheatPropertiesNearest(P_sat_SET, suctionTempRef);
        let p4_source = p4_lookup ? `Superheat Table @ P=${p4_lookup.pressure} bar, T_lookup=${suctionTempRef}°C` : 'Not Found';
        let p4_props = null;

        if (p4_lookup) {
            p4_props = {
                specificVolume_m3_per_kg: p4_lookup.properties.V,
                density_kg_per_m3: p4_lookup.properties.D,
                enthalpy_kj_per_kg: p4_lookup.properties.H,
                entropy_J_per_kgK: p4_lookup.properties.S,
                status: 'exact'
            };
        } else {
            // Fallback to Saturated Vapor at SET if superheat lookup fails
            const p4_sat = r513aSaturationService.getVaporProperties(set);
            if (p4_sat) {
                p4_props = {
                    specificVolume_m3_per_kg: p4_sat.specificVolume_m3_per_kg,
                    density_kg_per_m3: p4_sat.density_kg_per_m3,
                    enthalpy_kj_per_kg: p4_sat.enthalpy_kj_per_kg,
                    entropy_J_per_kgK: p4_sat.entropy_J_per_kgK,
                    status: 'saturated-fallback'
                };
                p4_source = p4_sat.source + ` (Plot T=${suctionTempRef}°C)`;
            }
        }

        const point4 = {
            name: 'Evaporator Outlet (Suction Gas)',
            type: 'suction',
            temperature: suctionTempRef, // Plot Y
            pressure: P_sat_SET,          // Plot X
            saturationTemp: set,
            source: p4_source,
            properties: p4_props,
            error: !p4_props ? `No data for SET=${set}°C at P=${P_sat_SET} bar` : null
        };

        // Filter out points with missing properties
        const validPoints = [point1, point2, point3, point4].filter(pt => pt.properties !== null);

        // Only calculate COP if all points are valid
        const h1 = point1.properties?.enthalpy_kj_per_kg;
        const h2 = point2.properties?.enthalpy_kj_per_kg;
        const h3 = point3.properties?.enthalpy_kj_per_kg;
        const h4 = point4.properties?.enthalpy_kj_per_kg;

        let cycleProperties = {};
        if (validPoints.length === 4) {
            cycleProperties = {
                condenseringCapacity: h1 - h2,
                evaporatingCapacity: h4 - h3,
                compressorWork: h1 - h4,
                COP: (h4 - h3) / (h1 - h4)
            };
        }

        return {
            status: 'success',
            refrigerant: 'R513A',
            inputs: {
                sct: sct,
                set: set,
                dischargeTempRef: dischargeTempRef,
                suctionTempRef: suctionTempRef,
                liquidTempRef: liquidTemp
            },
            saturationPressures: {
                psat_at_sct: P_sat_SCT,
                psat_at_set: P_sat_SET
            },
            cyclePoints: validPoints,
            cycleProperties: cycleProperties,
            plotData: {
                pressures: validPoints.map(p => p.pressure),
                enthalpies: validPoints.map(p => p.properties?.enthalpy_kj_per_kg),
                entropies: validPoints.map(p => p.properties?.entropy_J_per_kgK),
                densities: validPoints.map(p => p.properties?.density_kg_per_m3)
            }
        };

    } catch (error) {
        console.error('Error calculating R513A cycle:', error);
        return {
            status: 'error',
            message: error.message,
            stack: error.stack
        };
    }
}

/**
 * Validate R513A cycle inputs against available data ranges
 */
function validateCycleInputs(sct, set) {
    const minTemp = -60;
    const maxTemp = 90;

    const errors = [];

    if (isNaN(sct) || sct < minTemp || sct > maxTemp) {
        errors.push(`SCT must be between ${minTemp} and ${maxTemp}°C`);
    }

    if (isNaN(set) || set < minTemp || set > maxTemp) {
        errors.push(`SET must be between ${minTemp} and ${maxTemp}°C`);
    }

    if (set >= sct) {
        errors.push('SET must be lower than SCT');
    }

    return {
        status: errors.length > 0 ? 'invalid' : 'valid',
        errors: errors,
        temperatureRange: { min: minTemp, max: maxTemp }
    };
}

module.exports = {
    calculateR513ACyclePlottingPoints,
    validateCycleInputs
};

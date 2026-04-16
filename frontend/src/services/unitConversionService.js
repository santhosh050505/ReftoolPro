/**
 * UnitConversionService
 * 
 * Handles all unit conversions using formulas from unit_conversion_formulas.json
 * 
 * Supports:
 * - Pressure unit conversions (bar, psi, Pa, kPa, MPa, atm, mmHg, inHg, micron, at)
 * - Temperature unit conversions (°C ↔ °F)
 * 
 * API is ONLY used for refrigerant thermodynamic mapping (Pressure ↔ Temperature)
 * Unit conversions are done locally using formulas.
 */

class UnitConversionService {
  constructor() {
    this.formulas = null;
    this.loadPromise = this.loadFormulas();
  }

  /**
   * Load conversion formulas from JSON file
   */
  async loadFormulas() {
    try {
      const response = await fetch('/unit_conversion_formulas.json');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      this.formulas = await response.json();
      console.log('✅ Unit conversion formulas loaded');
      return this.formulas;
    } catch (error) {
      console.error('❌ Error loading unit conversion formulas:', error);
      this.formulas = { pressure: {}, temperature: {} };
      return {};
    }
  }

  /**
   * Ensure formulas are loaded
   */
  async ensureLoaded() {
    if (!this.formulas) {
      await this.loadPromise;
    }
  }

  /**
   * Convert pressure from one unit to another
   * 
   * @param {number} value - Pressure value to convert
   * @param {string} fromUnit - Source unit (bar, psi, Pa, kPa, MPa, atm, mmHg, inHg, micron, at)
   * @param {string} toUnit - Target unit
   * @returns {number} Converted pressure value
   * 
   * Example: convertPressure(100, 'Pa', 'kPa') → 0.1
   */
  async convertPressure(value, fromUnit, toUnit) {
    await this.ensureLoaded();

    // If same unit, return as is
    if (fromUnit === toUnit) {
      return parseFloat(value);
    }

    // Get formula for conversion
    if (!this.formulas.pressure || !this.formulas.pressure[fromUnit] || !this.formulas.pressure[fromUnit][toUnit]) {
      console.error(`❌ Pressure conversion formula not found: ${fromUnit} → ${toUnit}`);
      return value;
    }

    const formula = this.formulas.pressure[fromUnit][toUnit];
    
    try {
      // Create a function from the formula string
      // Formula examples: "bar * 100000", "Pa / 1000"
      const result = this.evaluateFormula(formula, fromUnit, value);
      return parseFloat(result);
    } catch (error) {
      console.error(`❌ Error converting pressure: ${error.message}`);
      return value;
    }
  }

  /**
   * Convert temperature from one unit to another
   * 
   * @param {number} value - Temperature value to convert
   * @param {string} fromUnit - Source unit ('C' or 'F')
   * @param {string} toUnit - Target unit ('C' or 'F')
   * @returns {number} Converted temperature value
   * 
   * Example: convertTemperature(0, 'C', 'F') → 32
   */
  async convertTemperature(value, fromUnit, toUnit) {
    await this.ensureLoaded();

    // If same unit, return as is
    if (fromUnit === toUnit) {
      return parseFloat(value);
    }

    // Get formula for conversion
    const fromKey = `${fromUnit}_to_${toUnit}`;
    
    if (!this.formulas.temperature || !this.formulas.temperature[fromKey]) {
      console.error(`❌ Temperature conversion formula not found: ${fromUnit} → ${toUnit}`);
      return value;
    }

    const formula = this.formulas.temperature[fromKey];
    
    try {
      // Create a function from the formula string
      // Formula examples: "(C * 9/5) + 32", "(F - 32) * 5/9"
      const result = this.evaluateFormula(formula, fromUnit, value);
      return parseFloat(result);
    } catch (error) {
      console.error(`❌ Error converting temperature: ${error.message}`);
      return value;
    }
  }

  /**
   * Evaluate a formula string with the given unit variable and value
   * 
   * @private
   * @param {string} formula - Formula string (e.g., "bar * 100000")
   * @param {string} unitVariable - Unit variable name (e.g., "bar", "Pa", "C", "F")
   * @param {number} value - Value to substitute
   * @returns {number} Evaluated result
   */
  evaluateFormula(formula, unitVariable, value) {
    // Replace the unit variable with the actual value
    let expression = formula.replace(new RegExp(unitVariable, 'g'), value);
    
    // Use Function constructor (safer than eval) to evaluate math expression
    try {
      // Validate that expression only contains safe characters
      if (!/^[0-9+\-*/(). ]+$/.test(expression)) {
        throw new Error('Invalid formula format');
      }
      
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict"; return (' + expression + ')')();
      return result;
    } catch (error) {
      console.error(`❌ Formula evaluation error: ${expression}`, error);
      throw error;
    }
  }

  /**
   * Get all supported pressure units
   */
  async getSupportedPressureUnits() {
    await this.ensureLoaded();
    return Object.keys(this.formulas.pressure || {});
  }

  /**
   * Get all supported temperature units
   */
  async getSupportedTemperatureUnits() {
    return ['C', 'F'];
  }

  /**
   * Check if a pressure unit is supported
   */
  async isPressureUnitSupported(unit) {
    const supported = await this.getSupportedPressureUnits();
    return supported.includes(unit);
  }

  /**
   * Check if a temperature unit is supported
   */
  async isTemperatureUnitSupported(unit) {
    const supported = await this.getSupportedTemperatureUnits();
    return supported.includes(unit);
  }
}

// Export singleton instance
const unitConversionService = new UnitConversionService();
export default unitConversionService;

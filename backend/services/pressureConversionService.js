const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

class PressureConversionService {
  constructor() {
    this.data = [];
    this.isLoaded = false;
    // Use relative path from project root
    this.filePath = path.join(__dirname, '../../newdata.xlsx');
  }

  /**
   * Initializes the service by loading the Excel file into memory.
   * Should be called at server start.
   */
  init() {
    try {
      if (!fs.existsSync(this.filePath)) {
        console.warn(`[PressureService] Excel file not found at ${this.filePath}. Service will be unavailable until file is provided.`);
        return false;
      }

      const workbook = xlsx.readFile(this.filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      this.data = xlsx.utils.sheet_to_json(worksheet);

      // Sort by altitude (m) to ensure consistency
      this.data.sort((a, b) => {
        const altA = a['Altitude (m)'] !== undefined ? a['Altitude (m)'] : -Infinity;
        const altB = b['Altitude (m)'] !== undefined ? b['Altitude (m)'] : -Infinity;
        return altA - altB;
      });

      this.isLoaded = true;

      console.log(`[PressureService] Loaded ${this.data.length} altitude rows from Excel.`);
      return true;
    } catch (error) {
      console.error('[PressureService] Error loading Excel file:', error.message);
      return false;
    }
  }

  /**
   * Returns all altitude data rows.
   */
  getAllData() {
    if (!this.isLoaded) this.init();
    return this.data;
  }

  /**
   * Finds the closest atmospheric pressure row for a given altitude.
   * @param {number} altitude - The altitude value
   * @param {string} unit - 'm' or 'ft'
   */
  getAtmosphericRow(altitude, unit) {
    if (!this.isLoaded) {
      this.init();
      if (!this.isLoaded) {
        throw new Error('Pressure service data not loaded. Please ensure the Excel file is provided.');
      }
    }

    const altKey = unit === 'ft' ? 'Altitude (ft)' : 'Altitude (m)';

    // Find the row with the closest altitude. 
    let closestRow = this.data[0];
    let minDiff = Math.abs((this.data[0][altKey] || 0) - altitude);

    for (const row of this.data) {
      const rowAlt = row[altKey];
      if (rowAlt === undefined) continue;

      const diff = Math.abs(rowAlt - altitude);
      if (diff < minDiff) {
        minDiff = diff;
        closestRow = row;
      }
    }

    return closestRow;
  }

  /**
   * Performs the conversion based on mode and altitude.
   * @param {Object} params - { pressureValue, altitude, altitudeUnit, pressureUnit, mode }
   */
  convert(params) {
    const { pressureValue, altitude, altitudeUnit, pressureUnit, mode } = params;

    const row = this.getAtmosphericRow(altitude, altitudeUnit);

    // Map units to Excel column names
    const unitMapping = {
      'bar': 'bar',
      'psi': 'psi',
      'Pa': 'Pa',
      'kPa': 'kPa',
      'MPa': 'mpa', // newdata.xlsx uses 'mpa' in lowercase based on inspection
      'atm': 'atm',
      'at': 'at',
      'mmHg': 'mm Hg', // newdata.xlsx uses 'mm Hg' based on inspection
      'µmHg': 'µm Hg', // newdata.xlsx uses 'µm Hg' based on inspection
      'inHg': 'In Hg'  // newdata.xlsx uses 'In Hg' based on inspection
    };

    const colName = unitMapping[pressureUnit] || pressureUnit;
    const atmosphericPressure = row[colName];

    if (atmosphericPressure === undefined) {
      console.warn(`[PressureService] Column "${colName}" not found in Excel. Available columns: ${Object.keys(row).join(', ')}`);
      throw new Error(`Pressure unit "${pressureUnit}" (column "${colName}") not found in Excel data.`);
    }

    let result;
    if (mode === 'absolute') {
      // Gauge -> Absolute: Abs = Gauge + Atm
      result = parseFloat(pressureValue) + parseFloat(atmosphericPressure);
    } else {
      // Absolute -> Gauge: Gauge = Abs - Atm
      result = parseFloat(pressureValue) - parseFloat(atmosphericPressure);
    }

    return {
      originalValue: pressureValue,
      atmosphericPressure: atmosphericPressure,
      result: result,
      unit: pressureUnit,
      altitude: altitude,
      altitudeUnit: altitudeUnit,
      mode: mode
    };
  }
}

module.exports = new PressureConversionService();

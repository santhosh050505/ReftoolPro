// CSV Refrigerant Data Service
// Manages loading and parsing refrigerant chemical properties from CSV file

class CSVRefrigerantService {
  static csvCache = null;

  /**
   * Load CSV file and parse it
   */
  static async loadCSVData() {
    try {
      if (this.csvCache) {
        return this.csvCache;
      }

      const response = await fetch('/refrigerants.csv');
      if (!response.ok) {
        throw new Error('Failed to load CSV file');
      }

      const csvText = await response.text();
      const refrigerants = this.parseCSV(csvText);
      this.csvCache = refrigerants;

      console.log('✅ CSV loaded with', refrigerants.length, 'refrigerants');
      return refrigerants;
    } catch (error) {
      console.error('Error loading CSV data:', error);
      return [];
    }
  }

  /**
   * Parse CSV text and return array of refrigerant objects
   */
  static parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    // Get headers from first line
    const headers = lines[0].split(',').map(h => h.trim());

    // Parse data rows
    const refrigerants = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const values = this.parseCSVLine(line);
      if (values.length === 0) continue;

      const refrigerant = {};
      headers.forEach((header, index) => {
        refrigerant[header] = values[index] || '';
      });

      refrigerants.push(refrigerant);
    }

    return refrigerants;
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  static parseCSVLine(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Get chemical properties for a specific refrigerant
   */
  static async getChemicalProperties(refrigerantName) {
    const refrigerants = await this.loadCSVData();
    return refrigerants.find(
      r => r.Refrigerant === refrigerantName ||
        r.Refrigerant === refrigerantName.toUpperCase()
    );
  }

  /**
   * Map CSV columns to display format
   */
  static mapToDisplayFormat(csvData) {
    if (!csvData) return null;

    return {
      name: csvData.Refrigerant || '',
      classification: csvData.Classification || '',
      gwpAR4: csvData['GWP (AR4)'] || '-',
      gwpAR5: csvData['GWP (AR5)'] || '-',
      gwpAR6: csvData['GWP (AR6)'] || '-',
      odp: csvData.ODP || '-',
      class: csvData.Class || '',
      chemicalBlendName: csvData['Chemical / Blend Name'] || '-',
      chemicalFormula: csvData['Chemical Formula / Composition'] || '',
      casNumber: csvData['CAS Number'] || '-',
      oilType: csvData['Oil Type'] || '',
      criticalTemperature: csvData['Critical Temperature (°F)'] || '-',
      criticalPressure: csvData['Critical Pressure (Psi)'] || '-',
      boilingPoint: csvData['Boiling Point (°F) at (0 psi g) (1 ATM)'] || '-',
      triplePoint: csvData['Triple Point (°F)'] || '-',
      nominalGlide: csvData['Nominal Glide'] || '-',
      normalDensity: csvData['Normal Density (kg/m3)'] || '-',
      molecularMass: csvData['Molecular Mass (g/mol) / (lb/lbmol)'] || '-',
      safetyGroup: csvData['Safety Group'] || '-',
      pedFluidGroup: csvData['PED Fluid Group'] || '-',
      lowerFlammabilityLimit: csvData['Lower Flammability Limit (kg/m3)'] || '-',
      autoIgnitionTemperature: csvData['Auto Ignition Temperature (°F)'] || '-'
    };
  }

  /**
   * Get all refrigerant names from CSV
   */
  static async getAllRefrigerantNames() {
    const refrigerants = await this.loadCSVData();
    return refrigerants.map(r => r.Refrigerant);
  }

  /**
   * Convert Fahrenheit to Celsius
   */
  static fahrenheitToCelsius(fahrenheit) {
    if (!fahrenheit || fahrenheit === '-' || fahrenheit === '') return '-';
    const f = parseFloat(fahrenheit);
    if (isNaN(f)) return '-';
    return ((f - 32) * 5) / 9;
  }

  /**
   * Convert Psi to Bar
   */
  static psiToBar(psi) {
    if (!psi || psi === '-' || psi === '') return '-';
    const p = parseFloat(psi);
    if (isNaN(p)) return '-';
    return p * 0.0689476;
  }
}

export default CSVRefrigerantService;

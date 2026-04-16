/**
 * Unit Conversion Service for Refrigerant Properties
 * Handles conversion of chemical properties to different units
 */

class PropertyUnitConverter {
  /**
   * Convert temperature value from Celsius to Fahrenheit
   */
  static celsiusToFahrenheit(celsius) {
    if (celsius === null || celsius === undefined || celsius === '-' || celsius === '') {
      return '-';
    }
    try {
      const c = parseFloat(celsius);
      if (isNaN(c)) return '-';
      return ((c * 9/5) + 32).toFixed(2);
    } catch {
      return '-';
    }
  }

  /**
   * Convert temperature DELTA (glide) from Celsius to Fahrenheit
   * For delta values, use formula: Δ°F = Δ°C × 9/5 (no +32 offset)
   */
  static deltaTemperatureCelsiusToFahrenheit(celsius) {
    if (celsius === null || celsius === undefined || celsius === '-' || celsius === '') {
      return '-';
    }
    try {
      const c = parseFloat(celsius);
      if (isNaN(c)) return '-';
      return (c * 9/5).toFixed(2);
    } catch {
      return '-';
    }
  }

  /**
   * Convert temperature DELTA (glide) from Fahrenheit to Celsius
   * For delta values, use formula: Δ°C = Δ°F × 5/9 (no -32 offset)
   */
  static deltaTemperatureFahrenheitToCelsius(fahrenheit) {
    if (fahrenheit === null || fahrenheit === undefined || fahrenheit === '-' || fahrenheit === '') {
      return '-';
    }
    try {
      const f = parseFloat(fahrenheit);
      if (isNaN(f)) return '-';
      return (f * 5/9).toFixed(2);
    } catch {
      return '-';
    }
  }

  /**
   * Normalize pressure unit name for matching
   */
  static normalizePressureUnit(unit) {
    if (!unit) return 'bar';
    
    let normalized = unit.toLowerCase().trim();
    
    // Extract just the main unit identifier, ignoring descriptions in parentheses
    // Handle cases like "μmHg (Micron)", "kPa", "bar", etc.
    normalized = normalized.split('(')[0].trim(); // Remove everything after parentheses
    normalized = normalized.replace(/[^\w]/g, ''); // Remove special characters except word chars
    
    // Map variations to standard names
    if (normalized.includes('bar')) return 'bar';
    if (normalized.includes('pa')) return normalized.includes('kpa') ? 'kpa' : normalized.includes('mpa') ? 'mpa' : 'pa';
    if (normalized.includes('psi')) return 'psi';
    if (normalized.includes('atm')) return 'atm';
    if (normalized.includes('mmhg')) return 'mmhg';
    if (normalized.includes('micron') || normalized.includes('mhg')) return 'micron';
    if (normalized.includes('inhg')) return 'inhg';
    if (normalized === 'at') return 'at';
    
    return 'bar'; // Default to bar
  }

  /**
   * Convert pressure value from bar to different units
   */
  static convertPressureFromBar(barValue, targetUnit) {
    if (barValue === null || barValue === undefined || barValue === '-' || barValue === '') {
      return '-';
    }
    
    try {
      const b = parseFloat(barValue);
      if (isNaN(b)) return '-';

      const normalized = this.normalizePressureUnit(targetUnit);
      
      // Pressure conversion factors from bar
      if (normalized === 'bar') {
        return b.toFixed(2);
      } else if (normalized === 'pa') {
        return (b * 100000).toFixed(2);
      } else if (normalized === 'kpa') {
        return (b * 100).toFixed(2);
      } else if (normalized === 'mpa') {
        return (b * 0.1).toFixed(2);
      } else if (normalized === 'psi') {
        return (b * 14.5038).toFixed(2);
      } else if (normalized === 'atm') {
        return (b * 0.986923).toFixed(2);
      } else if (normalized === 'at') {
        return (b * 1.01972).toFixed(2);
      } else if (normalized === 'mmhg') {
        return (b * 750.062).toFixed(2);
      } else if (normalized === 'micron') {
        return (b * 750062).toFixed(2);
      } else if (normalized === 'inhg') {
        return (b * 29.5299).toFixed(2);
      } else {
        return b.toFixed(2); // Default to bar
      }
    } catch {
      return '-';
    }
  }

  /**
   * Get pressure unit symbol
   */
  static getPressureUnitSymbol(unit = 'bar') {
    const normalized = this.normalizePressureUnit(unit);
    
    const symbols = {
      'bar': 'bar',
      'pa': 'Pa',
      'kpa': 'kPa',
      'mpa': 'MPa',
      'psi': 'psi',
      'atm': 'atm',
      'at': 'at',
      'mmhg': 'mmHg',
      'micron': 'μmHg',
      'inhg': 'inHg'
    };
    
    return symbols[normalized] || 'bar';
  }

  /**
   * Get temperature value in the requested unit
   * @param {string} celsiusValue - Value in Celsius (default unit)
   * @param {string} unit - Target unit: 'celsius' or 'fahrenheit'
   */
  static getTemperatureValue(celsiusValue, unit = 'celsius') {
    if (celsiusValue === '-' || celsiusValue === '') {
      return '-';
    }
    
    if (unit === 'fahrenheit' || unit === 'F' || unit === '°F') {
      return this.celsiusToFahrenheit(celsiusValue);
    }
    return celsiusValue; // Return as-is for Celsius
  }

  /**
   * Get temperature DELTA (nominal glide) value in the requested unit
   * Uses delta conversion formulas without offset (Δ°F = Δ°C × 9/5)
   * @param {string} celsiusValue - Delta temperature in Celsius (default unit)
   * @param {string} unit - Target unit: 'celsius' or 'fahrenheit'
   */
  static getNominalGlideValue(celsiusValue, unit = 'celsius') {
    if (celsiusValue === '-' || celsiusValue === '') {
      return '-';
    }
    
    if (unit === 'fahrenheit' || unit === 'F' || unit === '°F') {
      return this.deltaTemperatureCelsiusToFahrenheit(celsiusValue);
    }
    return celsiusValue; // Return as-is for Celsius
  }

  /**
   * Get temperature unit symbol
   */
  static getTemperatureUnitSymbol(unit = 'celsius') {
    const normalized = unit.toLowerCase();
    if (normalized === 'fahrenheit' || normalized === 'f' || normalized === '°f') {
      return '°F';
    }
    return '°C';
  }

  /**
   * Get pressure value in the requested unit
   * @param {string} barValue - Value in bar (default unit)
   * @param {string} unit - Target unit
   */
  static getPressureValue(barValue, unit = 'bar') {
    if (barValue === '-' || barValue === '') {
      return '-';
    }
    
    return this.convertPressureFromBar(barValue, unit);
  }
}

export default PropertyUnitConverter;

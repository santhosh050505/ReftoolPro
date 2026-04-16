// backend/services/syncService.js
const fs = require('fs');
const path = require('path');

class SyncService {
  constructor() {
    this.sourceFile = path.join(__dirname, '../../frontend/refrigerant-data/refrigerant-properties.json');
    this.publicFile = path.join(__dirname, '../../frontend/public/refrigerant-data/refrigerant-properties.json');
    this.buildFile = path.join(__dirname, '../../frontend/build/refrigerant-data/refrigerant-properties.json');
    this.rangeSourceFile = path.join(__dirname, '../../refrigerant_updated.json');
    this.rangePublicFile = path.join(__dirname, '../../frontend/public/refrigerant_updated.json');
    this.rangeBuildFile = path.join(__dirname, '../../frontend/build/refrigerant_updated.json');
  }

  normalizeRefrigerant(ref) {
    return {
      name: ref.name || '',
      id: ref.id || ref.name,
      classification: ref.classification || '',
      gwpAR4: ref.gwpAR4 || '',
      gwpAR5: ref.gwpAR5 || '',
      gwpAR6: ref.gwpAR6 || '',
      odp: ref.odp || '',
      class: ref.class || '',
      chemicalFormula: ref.chemicalFormula || '',
      oilType: ref.oilType || '',
      criticalTemperature: ref.criticalTemperature || '',
      criticalPressure: ref.criticalPressure || '',
      boilingPoint: ref.boilingPoint || '',
      triplePoint: ref.triplePoint || '',
      nominalGlide: ref.nominalGlide || '',
      normalDensity: ref.normalDensity || '',
      molecularMass: ref.molecularMass || '',
      safetyGroup: ref.safetyGroup || '',
      pedFluidGroup: ref.pedFluidGroup || '',
      lowerFlammabilityLimit: ref.lowerFlammabilityLimit || '',
      autoIgnitionTemperature: ref.autoIgnitionTemperature || ''
    };
  }

  createDistributionVersion(refrigerant) {
    const normalized = this.normalizeRefrigerant(refrigerant);
    return {
      name: normalized.name,
      rNumber: normalized.name,
      classification: normalized.classification,
      gwpAR4: normalized.gwpAR4 ? parseInt(normalized.gwpAR4) || 0 : 0,
      gwpAR5: normalized.gwpAR5 ? parseInt(normalized.gwpAR5) || 0 : 0,
      gwpAR6: normalized.gwpAR6 ? parseInt(normalized.gwpAR6) || 0 : 0,
      odp: normalized.odp ? parseFloat(normalized.odp) || 0 : 0,
      color: '',
      class: normalized.class,
      chemicalFormula: normalized.chemicalFormula,
      oilType: normalized.oilType,
      criticalTemperature: normalized.criticalTemperature ? parseFloat(normalized.criticalTemperature) : null,
      criticalPressure: normalized.criticalPressure ? parseFloat(normalized.criticalPressure) : null,
      boilingPoint: normalized.boilingPoint ? parseFloat(normalized.boilingPoint) : null,
      triplePoint: normalized.triplePoint || '-',
      nominalGlide: normalized.nominalGlide ? parseFloat(normalized.nominalGlide) : 0,
      density: normalized.normalDensity ? parseFloat(normalized.normalDensity) : null,
      molecularMass: normalized.molecularMass ? parseFloat(normalized.molecularMass) : null,
      safetyGroup: normalized.safetyGroup,
      pedFluidGroup: normalized.pedFluidGroup ? parseInt(normalized.pedFluidGroup) : null,
      flammabilityLimit: normalized.lowerFlammabilityLimit || '-',
      autoIgnitionTemp: normalized.autoIgnitionTemperature && normalized.autoIgnitionTemperature !== '-' ? parseInt(normalized.autoIgnitionTemperature) : null,
      id: normalized.id
    };
  }

  ensureDirectoryExists(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async syncRefrigerantProperties() {
    try {
      if (!fs.existsSync(this.sourceFile)) {
        return { success: false, error: 'Source file not found' };
      }

      const sourceData = JSON.parse(fs.readFileSync(this.sourceFile, 'utf8'));
      const sourceRefrigerants = Object.values(sourceData);

      const publicData = {
        refrigerants: sourceRefrigerants.map(ref => this.createDistributionVersion(ref))
      };

      this.ensureDirectoryExists(this.publicFile);
      fs.writeFileSync(this.publicFile, JSON.stringify(publicData, null, 2));

      this.ensureDirectoryExists(this.buildFile);
      fs.writeFileSync(this.buildFile, JSON.stringify(publicData, null, 2));

      return { success: true, refrigerants: sourceRefrigerants.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async syncRangeData() {
    try {
      if (!fs.existsSync(this.rangeSourceFile)) {
        return { success: false, error: 'Range source file not found' };
      }

      const rangeData = fs.readFileSync(this.rangeSourceFile, 'utf8');

      this.ensureDirectoryExists(this.rangePublicFile);
      fs.writeFileSync(this.rangePublicFile, rangeData);

      this.ensureDirectoryExists(this.rangeBuildFile);
      fs.writeFileSync(this.rangeBuildFile, rangeData);

      const stats = fs.statSync(this.rangePublicFile);
      return { success: true, size: stats.size };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async syncAll() {
    const results = {
      properties: await this.syncRefrigerantProperties(),
      ranges: await this.syncRangeData()
    };

    if (results.properties.success && results.ranges.success) {
      return { success: true };
    } else {
      return { success: false, errors: results };
    }
  }
}

module.exports = new SyncService();

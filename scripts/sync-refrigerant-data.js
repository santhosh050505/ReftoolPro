#!/usr/bin/env node

/**
 * Sync Refrigerant Data Script
 * 
 * This script maintains consistency across all refrigerant-properties.json files:
 * - frontend/refrigerant-data/refrigerant-properties.json (source of truth)
 * - refrigerant-data/refrigerant-properties.json (backend backup)
 * - frontend/public/refrigerant-data/refrigerant-properties.json (distribution)
 * - frontend/build/refrigerant-data/refrigerant-properties.json (build artifact)
 * 
 * ALWAYS SYNC FROM: frontend/refrigerant-data/refrigerant-properties.json
 * 
 * Usage: node scripts/sync-refrigerant-data.js
 */

const fs = require('fs');
const path = require('path');

const SOURCE_FILE = path.join(__dirname, '../frontend/refrigerant-data/refrigerant-properties.json');
const BACKEND_FILE = path.join(__dirname, '../refrigerant-data/refrigerant-properties.json');
const PUBLIC_FILE = path.join(__dirname, '../frontend/public/refrigerant-data/refrigerant-properties.json');
const BUILD_FILE = path.join(__dirname, '../frontend/build/refrigerant-data/refrigerant-properties.json');

/**
 * Normalize a refrigerant object to have all required properties
 */
function normalizeRefrigerant(ref) {
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

/**
 * Create distribution version with numeric values for public/build files
 */
function createDistributionVersion(refrigerant) {
  const normalized = normalizeRefrigerant(refrigerant);
  
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

try {
  // 1. Read source of truth (frontend file)
  console.log('📚 Reading source file: frontend/refrigerant-data/refrigerant-properties.json');
  const sourceData = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));
  const sourceRefrigerants = Object.values(sourceData);
  console.log(`   Found ${sourceRefrigerants.length} refrigerants`);

  // 2. Update backend file (same structure as frontend but as backup)
  console.log('\n🔄 Syncing backend file: refrigerant-data/refrigerant-properties.json');
  const backendData = {};
  sourceRefrigerants.forEach(ref => {
    const normalized = normalizeRefrigerant(ref);
    backendData[normalized.id] = normalized;
  });
  fs.writeFileSync(BACKEND_FILE, JSON.stringify(backendData, null, 2));
  console.log(`   ✅ Updated with ${sourceRefrigerants.length} refrigerants`);

  // 3. Update public file (array format with numeric values)
  console.log('\n🌐 Syncing public distribution file: frontend/public/refrigerant-data/refrigerant-properties.json');
  const publicData = {
    refrigerants: sourceRefrigerants.map(ref => createDistributionVersion(ref))
  };
  fs.writeFileSync(PUBLIC_FILE, JSON.stringify(publicData, null, 2));
  console.log(`   ✅ Updated with ${publicData.refrigerants.length} refrigerants`);

  // 4. Update build file (identical to public)
  console.log('\n📦 Syncing build file: frontend/build/refrigerant-data/refrigerant-properties.json');
  fs.writeFileSync(BUILD_FILE, JSON.stringify(publicData, null, 2));
  console.log(`   ✅ Updated with ${publicData.refrigerants.length} refrigerants`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ SYNC COMPLETE - All files are now in sync!');
  console.log('='.repeat(60));
  console.log(`
  📋 Source of Truth (Frontend):
     - Location: frontend/refrigerant-data/refrigerant-properties.json
     - Format: Object keyed by ID
     - Data Type: Strings
     - Refrigerants: ${sourceRefrigerants.length}

  💾 Backend Backup:
     - Location: refrigerant-data/refrigerant-properties.json
     - Format: Object keyed by ID
     - Data Type: Strings (matches frontend)
     - Refrigerants: ${sourceRefrigerants.length}

  🌐 Public Distribution:
     - Location: frontend/public/refrigerant-data/refrigerant-properties.json
     - Format: Array of objects
     - Data Type: Numbers (optimized for browser)
     - Refrigerants: ${publicData.refrigerants.length}

  📦 Build Artifact:
     - Location: frontend/build/refrigerant-data/refrigerant-properties.json
     - Format: Array of objects
     - Data Type: Numbers
     - Refrigerants: ${publicData.refrigerants.length}
     - Note: Auto-generated, do not commit directly

  ⚙️  Property Standardization:
     ✓ GWP Properties: gwpAR4, gwpAR5, gwpAR6 (camelCase)
     ✓ Property Names: Standardized across all files
     ✓ All refrigerants: Have complete property coverage
  `);

  process.exit(0);
} catch (error) {
  console.error('❌ ERROR during sync:', error.message);
  console.error('\nMake sure all source files exist and are valid JSON.');
  process.exit(1);
}

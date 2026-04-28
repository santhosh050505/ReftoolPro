// backend/services/jsonFileService.js
const fs = require('fs');
const path = require('path');

class JsonFileService {
  constructor() {
    this.jsonFilePath = path.join(__dirname, '../data/refrigerant-properties.json');
    this.backupPath = path.join(__dirname, '../data/refrigerants-backup.json');
  }

  getAllRefrigerants() {
    try {
      if (!fs.existsSync(this.jsonFilePath)) {
        this.initializeFile();
      }

      const data = fs.readFileSync(this.jsonFilePath, 'utf8');
      const parsed = JSON.parse(data);

      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.values(parsed);
      }

      if (Array.isArray(parsed.refrigerants)) {
        return parsed.refrigerants;
      }

      return [];
    } catch (error) {
      console.error('Error reading JSON file:', error.message);
      return [];
    }
  }

  getRefrigerantByName(name) {
    try {
      const refrigerants = this.getAllRefrigerants();
      return refrigerants.find(r => r.name === name || r.rNumber === name);
    } catch (error) {
      console.error('Error getting refrigerant by name:', error.message);
      return null;
    }
  }

  getRangeData(refrigerantName) {
    try {
      const rangeFilePath = path.join(__dirname, '../../refrigerant_updated.json');
      if (!fs.existsSync(rangeFilePath)) return null;

      const data = fs.readFileSync(rangeFilePath, 'utf8');
      const ranges = JSON.parse(data);
      return ranges[refrigerantName] || null;
    } catch (error) {
      console.error('Error reading range data:', error.message);
      return null;
    }
  }

  addRefrigerant(refrigerantData) {
    try {
      const refrigerants = this.getAllRefrigerants();
      const exists = refrigerants.find(r => r.name === refrigerantData.name || r.rNumber === refrigerantData.rNumber);
      if (exists) {
        throw new Error(`Refrigerant "${refrigerantData.name}" already exists`);
      }

      const newRefrigerant = {
        name: refrigerantData.name,
        rNumber: refrigerantData.rNumber || refrigerantData.name,
        ...refrigerantData
      };

      refrigerants.push(newRefrigerant);
      this.saveRefrigerants(refrigerants);
      return newRefrigerant;
    } catch (error) {
      console.error('Error adding refrigerant:', error.message);
      throw error;
    }
  }

  updateRefrigerant(name, updates) {
    try {
      const refrigerants = this.getAllRefrigerants();
      const index = refrigerants.findIndex(r =>
        (r.name && r.name.toUpperCase() === name.toUpperCase()) ||
        (r.rNumber && r.rNumber.toUpperCase() === name.toUpperCase())
      );

      if (index === -1) {
        throw new Error(`Refrigerant "${name}" not found`);
      }

      refrigerants[index] = {
        ...refrigerants[index],
        ...updates,
        name: refrigerants[index].name,
        rNumber: refrigerants[index].rNumber
      };

      this.saveRefrigerants(refrigerants);
      return refrigerants[index];
    } catch (error) {
      console.error('Error updating refrigerant:', error.message);
      throw error;
    }
  }

  deleteRefrigerant(name) {
    try {
      const refrigerants = this.getAllRefrigerants();
      const index = refrigerants.findIndex(r =>
        (r.name && r.name.toUpperCase() === name.toUpperCase()) ||
        (r.rNumber && r.rNumber.toUpperCase() === name.toUpperCase())
      );

      if (index === -1) {
        throw new Error(`Refrigerant "${name}" not found`);
      }

      const deleted = refrigerants.splice(index, 1)[0];
      this.saveRefrigerants(refrigerants);
      this.deleteFromRangeFile(name);
      return deleted;
    } catch (error) {
      console.error('Error deleting refrigerant:', error.message);
      throw error;
    }
  }

  deleteFromRangeFile(name) {
    try {
      const rangeFilePath = path.join(__dirname, '../../refrigerant_updated.json');
      if (!fs.existsSync(rangeFilePath)) return;

      const data = fs.readFileSync(rangeFilePath, 'utf8');
      const ranges = JSON.parse(data);

      if (ranges[name]) {
        delete ranges[name];
        fs.writeFileSync(rangeFilePath, JSON.stringify(ranges, null, 2), 'utf8');
      }
    } catch (error) {
      // Continue even if range deletion fails
    }
  }

  saveRefrigerants(refrigerants) {
    try {
      const data = {};
      refrigerants.forEach(ref => {
        const key = ref.name || ref.rNumber;
        data[key] = ref;
      });

      const dir = path.dirname(this.jsonFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.jsonFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving refrigerants:', error.message);
      throw error;
    }
  }

  initializeFile() {
    try {
      const defaultData = { refrigerants: [] };
      const dir = path.dirname(this.jsonFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.jsonFilePath, JSON.stringify(defaultData, null, 2), 'utf8');
    } catch (error) {
      console.error('Error initializing file:', error.message);
      throw error;
    }
  }

  validateFile() {
    try {
      if (!fs.existsSync(this.jsonFilePath)) {
        this.initializeFile();
        return true;
      }
      const data = fs.readFileSync(this.jsonFilePath, 'utf8');
      JSON.parse(data);
      return true;
    } catch (error) {
      console.error('File validation error:', error.message);
      return false;
    }
  }
}

module.exports = new JsonFileService();

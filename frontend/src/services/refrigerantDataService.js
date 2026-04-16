// Refrigerant Data Service
// Manages all refrigerant data operations and syncing with main database

const ADMIN_STORAGE_KEY = 'adminRefrigerants';
const USER_STORAGE_KEY = 'userRefrigerants';
const MAIN_DB_KEY = 'mainRefrigerantDatabase';

class RefrigerantDataService {
  /**
   * Initialize or get main refrigerant database
   */
  static initializeMainDatabase(defaultData = []) {
    try {
      let mainDB = localStorage.getItem(MAIN_DB_KEY);
      
      if (!mainDB) {
        mainDB = defaultData;
        localStorage.setItem(MAIN_DB_KEY, JSON.stringify(mainDB));
        console.log('✅ Main refrigerant database initialized with', mainDB.length, 'refrigerants');
      } else {
        mainDB = JSON.parse(mainDB);
      }
      
      return mainDB;
    } catch (err) {
      console.error('Error initializing main database:', err);
      return defaultData;
    }
  }

  /**
   * Get all refrigerants from main database
   */
  static getAllRefrigerants() {
    try {
      const data = localStorage.getItem(MAIN_DB_KEY);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.error('Error getting refrigerants:', err);
      return [];
    }
  }

  /**
   * Get single refrigerant by ID
   */
  static getRefrigerantById(id) {
    try {
      const allRefrigerants = this.getAllRefrigerants();
      return allRefrigerants.find(r => r.id === id);
    } catch (err) {
      console.error('Error getting refrigerant by ID:', err);
      return null;
    }
  }

  /**
   * Get single refrigerant by name or rNumber
   */
  static getRefrigerantByName(name) {
    try {
      const allRefrigerants = this.getAllRefrigerants();
      return allRefrigerants.find(r => r.name === name || r.rNumber === name);
    } catch (err) {
      console.error('Error getting refrigerant by name:', err);
      return null;
    }
  }

  /**
   * Add new refrigerant to main database
   */
  static addRefrigerant(refrigerantData) {
    try {
      const allRefrigerants = this.getAllRefrigerants();
      
      // Generate new ID
      const newId = allRefrigerants.length > 0 
        ? Math.max(...allRefrigerants.map(r => r.id || 0)) + 1 
        : 1;
      
      // Create new refrigerant object
      const newRefrigerant = {
        id: newId,
        ...refrigerantData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add to main database
      allRefrigerants.push(newRefrigerant);
      localStorage.setItem(MAIN_DB_KEY, JSON.stringify(allRefrigerants));
      
      console.log('✅ New refrigerant added:', newRefrigerant.name);
      
      // Sync with admin and user storage
      this.syncAdminAndUserData();
      
      return newRefrigerant;
    } catch (err) {
      console.error('Error adding refrigerant:', err);
      throw new Error('Failed to add refrigerant: ' + err.message);
    }
  }

  /**
   * Update existing refrigerant in main database
   */
  static updateRefrigerant(id, refrigerantData) {
    try {
      const allRefrigerants = this.getAllRefrigerants();
      const index = allRefrigerants.findIndex(r => r.id === id);
      
      if (index === -1) {
        throw new Error(`Refrigerant with ID ${id} not found`);
      }
      
      // Preserve original ID and creation date, update other fields
      allRefrigerants[index] = {
        ...allRefrigerants[index],
        ...refrigerantData,
        id: allRefrigerants[index].id,
        createdAt: allRefrigerants[index].createdAt,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem(MAIN_DB_KEY, JSON.stringify(allRefrigerants));
      
      console.log('✅ Refrigerant updated:', allRefrigerants[index].name);
      
      // Sync with admin and user storage
      this.syncAdminAndUserData();
      
      return allRefrigerants[index];
    } catch (err) {
      console.error('Error updating refrigerant:', err);
      throw new Error('Failed to update refrigerant: ' + err.message);
    }
  }

  /**
   * Delete refrigerant from main database
   */
  static deleteRefrigerant(id) {
    try {
      const allRefrigerants = this.getAllRefrigerants();
      const refrigerant = allRefrigerants.find(r => r.id === id);
      
      if (!refrigerant) {
        throw new Error(`Refrigerant with ID ${id} not found`);
      }
      
      const updatedList = allRefrigerants.filter(r => r.id !== id);
      localStorage.setItem(MAIN_DB_KEY, JSON.stringify(updatedList));
      
      console.log('✅ Refrigerant deleted:', refrigerant.name);
      
      // Sync with admin and user storage
      this.syncAdminAndUserData();
      
      return refrigerant;
    } catch (err) {
      console.error('Error deleting refrigerant:', err);
      throw new Error('Failed to delete refrigerant: ' + err.message);
    }
  }

  /**
   * Sync main database to admin and user storage
   */
  static syncAdminAndUserData() {
    try {
      const mainDB = this.getAllRefrigerants();
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(mainDB));
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mainDB));
      console.log('🔄 Data synced to admin and user storage');
    } catch (err) {
      console.error('Error syncing data:', err);
    }
  }

  /**
   * Load main database to admin storage
   */
  static loadMainDBToAdmin() {
    try {
      const mainDB = this.getAllRefrigerants();
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(mainDB));
      return mainDB;
    } catch (err) {
      console.error('Error loading main DB to admin:', err);
      return [];
    }
  }

  /**
   * Load main database to user storage
   */
  static loadMainDBToUser() {
    try {
      const mainDB = this.getAllRefrigerants();
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mainDB));
      return mainDB;
    } catch (err) {
      console.error('Error loading main DB to user:', err);
      return [];
    }
  }

  /**
   * Get statistics
   */
  static getStatistics() {
    try {
      const allRefrigerants = this.getAllRefrigerants();
      return {
        total: allRefrigerants.length,
        byClass: this.groupByClass(allRefrigerants),
        bySafetyGroup: this.groupBySafetyGroup(allRefrigerants)
      };
    } catch (err) {
      console.error('Error getting statistics:', err);
      return { total: 0, byClass: {}, bySafetyGroup: {} };
    }
  }

  /**
   * Group refrigerants by class
   */
  static groupByClass(refrigerants) {
    return refrigerants.reduce((acc, r) => {
      const className = r.class || 'Unknown';
      acc[className] = (acc[className] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Group refrigerants by safety group
   */
  static groupBySafetyGroup(refrigerants) {
    return refrigerants.reduce((acc, r) => {
      const safetyGroup = r.safetyGroup || 'Unknown';
      acc[safetyGroup] = (acc[safetyGroup] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Search refrigerants
   */
  static searchRefrigerants(query) {
    try {
      const allRefrigerants = this.getAllRefrigerants();
      const lowerQuery = query.toLowerCase();
      
      return allRefrigerants.filter(r => 
        r.name?.toLowerCase().includes(lowerQuery) ||
        r.rNumber?.toLowerCase().includes(lowerQuery) ||
        r.chemicalFormula?.toLowerCase().includes(lowerQuery) ||
        r.class?.toLowerCase().includes(lowerQuery)
      );
    } catch (err) {
      console.error('Error searching refrigerants:', err);
      return [];
    }
  }

  /**
   * Export all data as JSON
   */
  static exportData() {
    try {
      const mainDB = this.getAllRefrigerants();
      return JSON.stringify(mainDB, null, 2);
    } catch (err) {
      console.error('Error exporting data:', err);
      return '[]';
    }
  }

  /**
   * Import data from JSON
   */
  static importData(jsonData) {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      
      if (!Array.isArray(data)) {
        throw new Error('Imported data must be an array');
      }
      
      localStorage.setItem(MAIN_DB_KEY, JSON.stringify(data));
      this.syncAdminAndUserData();
      
      console.log('✅ Data imported:', data.length, 'refrigerants');
      return data;
    } catch (err) {
      console.error('Error importing data:', err);
      throw new Error('Failed to import data: ' + err.message);
    }
  }

  /**
   * Clear all data
   */
  static clearAll() {
    try {
      localStorage.removeItem(MAIN_DB_KEY);
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      console.log('🗑️ All refrigerant data cleared');
    } catch (err) {
      console.error('Error clearing data:', err);
    }
  }
}

export default RefrigerantDataService;

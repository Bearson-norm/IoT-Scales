// Server Database Configuration Utility
// Handles configuration and connection to external databases for import

class ServerDatabaseConfig {
  constructor() {
    this.configurations = [];
    this.loadConfigurations();
  }

  // Load configurations from localStorage (in real app, this would be from database)
  loadConfigurations() {
    try {
      const configs = localStorage.getItem('server_database_configs');
      this.configurations = configs ? JSON.parse(configs) : [];
    } catch (error) {
      console.error('Error loading server database configurations:', error);
      this.configurations = [];
    }
  }

  // Save configurations to localStorage
  saveConfigurations() {
    try {
      localStorage.setItem('server_database_configs', JSON.stringify(this.configurations));
      return true;
    } catch (error) {
      console.error('Error saving server database configurations:', error);
      return false;
    }
  }

  // Add new server configuration
  async addConfiguration(config) {
    try {
      const newConfig = {
        id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: config.name,
        description: config.description,
        host: config.host,
        port: config.port || 5432,
        database_name: config.database_name,
        username: config.username,
        password_encrypted: this.encryptPassword(config.password),
        connection_type: config.connection_type || 'postgresql',
        ssl_enabled: config.ssl_enabled || false,
        timeout_seconds: config.timeout_seconds || 30,
        max_connections: config.max_connections || 10,
        is_active: config.is_active !== false,
        created_by: config.created_by,
        created_at: new Date(),
        updated_at: new Date()
      };

      this.configurations.push(newConfig);
      this.saveConfigurations();
      return newConfig;
    } catch (error) {
      console.error('Error adding server configuration:', error);
      return null;
    }
  }

  // Update server configuration
  async updateConfiguration(id, updates) {
    try {
      const configIndex = this.configurations.findIndex(config => config.id === id);
      if (configIndex === -1) return null;

      const updatedConfig = {
        ...this.configurations[configIndex],
        ...updates,
        updated_at: new Date()
      };

      // Encrypt password if provided
      if (updates.password) {
        updatedConfig.password_encrypted = this.encryptPassword(updates.password);
        delete updatedConfig.password;
      }

      this.configurations[configIndex] = updatedConfig;
      this.saveConfigurations();
      return updatedConfig;
    } catch (error) {
      console.error('Error updating server configuration:', error);
      return null;
    }
  }

  // Delete server configuration
  async deleteConfiguration(id) {
    try {
      const configIndex = this.configurations.findIndex(config => config.id === id);
      if (configIndex === -1) return false;

      this.configurations.splice(configIndex, 1);
      this.saveConfigurations();
      return true;
    } catch (error) {
      console.error('Error deleting server configuration:', error);
      return false;
    }
  }

  // Get all configurations
  getConfigurations() {
    return this.configurations;
  }

  // Get active configurations
  getActiveConfigurations() {
    return this.configurations.filter(config => config.is_active);
  }

  // Get configuration by ID
  getConfiguration(id) {
    return this.configurations.find(config => config.id === id);
  }

  // Test database connection
  async testConnection(configId) {
    try {
      const config = this.getConfiguration(configId);
      if (!config) return { success: false, error: 'Configuration not found' };

      // In a real implementation, this would test the actual database connection
      // For demo purposes, we'll simulate connection testing
      return new Promise((resolve) => {
        setTimeout(() => {
          // Simulate connection test
          const success = Math.random() > 0.2; // 80% success rate for demo
          resolve({
            success,
            error: success ? null : 'Connection failed: Invalid credentials or network error',
            responseTime: Math.floor(Math.random() * 1000) + 100
          });
        }, 1000);
      });
    } catch (error) {
      console.error('Error testing connection:', error);
      return { success: false, error: error.message };
    }
  }

  // Import data from server database
  async importFromServer(configId, importType, tableName, filters = {}) {
    try {
      const config = this.getConfiguration(configId);
      if (!config) return { success: false, error: 'Configuration not found' };

      // In a real implementation, this would connect to the external database
      // and import data. For demo purposes, we'll simulate the import process
      return new Promise((resolve) => {
        setTimeout(() => {
          const success = Math.random() > 0.1; // 90% success rate for demo
          const recordCount = Math.floor(Math.random() * 100) + 10;
          
          resolve({
            success,
            error: success ? null : 'Import failed: Database connection error',
            records_imported: success ? recordCount : 0,
            records_failed: success ? 0 : recordCount,
            import_details: {
              source_database: config.database_name,
              source_table: tableName,
              import_type: importType,
              filters: filters
            }
          });
        }, 2000);
      });
    } catch (error) {
      console.error('Error importing from server:', error);
      return { success: false, error: error.message };
    }
  }

  // Encrypt password (simple encryption for demo)
  encryptPassword(password) {
    // In a real implementation, use proper encryption
    return btoa(password); // Base64 encoding for demo
  }

  // Decrypt password
  decryptPassword(encryptedPassword) {
    // In a real implementation, use proper decryption
    return atob(encryptedPassword); // Base64 decoding for demo
  }

  // Get supported database types
  getSupportedDatabaseTypes() {
    return [
      { value: 'postgresql', label: 'PostgreSQL' },
      { value: 'mysql', label: 'MySQL' },
      { value: 'sqlserver', label: 'SQL Server' }
    ];
  }

  // Get default configuration template
  getDefaultConfiguration() {
    return {
      name: '',
      description: '',
      host: 'localhost',
      port: 5432,
      database_name: '',
      username: '',
      password: '',
      connection_type: 'postgresql',
      ssl_enabled: false,
      timeout_seconds: 30,
      max_connections: 10,
      is_active: true
    };
  }
}

// Create singleton instance
const serverDatabaseConfig = new ServerDatabaseConfig();

export default serverDatabaseConfig;


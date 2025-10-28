// Import Logger Utility
// Handles logging of database imports for master data

class ImportLogger {
  constructor() {
    this.currentUser = null;
    this.database = null;
  }

  // Initialize logger with user and database connection
  initialize(user, database) {
    this.currentUser = user;
    this.database = database;
  }

  // Start import logging
  async startImport(importType, sourceType, sourceName = null, serverConfig = null) {
    try {
      const importLog = {
        import_type: importType,
        source_type: sourceType,
        source_name: sourceName,
        server_config: serverConfig,
        total_records: 0,
        successful_records: 0,
        failed_records: 0,
        error_details: null,
        status: 'in_progress',
        imported_by: this.currentUser?.id,
        started_at: new Date(),
        completed_at: null
      };

      // In a real implementation, this would save to database
      // For now, we'll use localStorage for demo
      const logId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(`import_log_${logId}`, JSON.stringify(importLog));
      
      return logId;
    } catch (error) {
      console.error('Error starting import log:', error);
      return null;
    }
  }

  // Update import progress
  async updateImportProgress(logId, totalRecords, successfulRecords, failedRecords, errors = []) {
    try {
      const logData = localStorage.getItem(`import_log_${logId}`);
      if (!logData) return false;

      const log = JSON.parse(logData);
      log.total_records = totalRecords;
      log.successful_records = successfulRecords;
      log.failed_records = failedRecords;
      log.error_details = errors.length > 0 ? errors : null;

      localStorage.setItem(`import_log_${logId}`, JSON.stringify(log));
      return true;
    } catch (error) {
      console.error('Error updating import progress:', error);
      return false;
    }
  }

  // Complete import logging
  async completeImport(logId, success = true) {
    try {
      const logData = localStorage.getItem(`import_log_${logId}`);
      if (!logData) return false;

      const log = JSON.parse(logData);
      log.status = success ? 'completed' : 'failed';
      log.completed_at = new Date();

      localStorage.setItem(`import_log_${logId}`, JSON.stringify(log));
      return true;
    } catch (error) {
      console.error('Error completing import log:', error);
      return false;
    }
  }

  // Get import history
  async getImportHistory(limit = 50, offset = 0) {
    try {
      const importLogs = [];
      const keys = Object.keys(localStorage);
      
      for (const key of keys) {
        if (key.startsWith('import_log_')) {
          const logData = localStorage.getItem(key);
          if (logData) {
            const log = JSON.parse(logData);
            importLogs.push({
              id: key.replace('import_log_', ''),
              ...log
            });
          }
        }
      }

      // Sort by created_at descending
      importLogs.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));

      return {
        logs: importLogs.slice(offset, offset + limit),
        total: importLogs.length,
        hasMore: offset + limit < importLogs.length
      };
    } catch (error) {
      console.error('Error getting import history:', error);
      return { logs: [], total: 0, hasMore: false };
    }
  }

  // Get import statistics
  async getImportStatistics() {
    try {
      const importLogs = [];
      const keys = Object.keys(localStorage);
      
      for (const key of keys) {
        if (key.startsWith('import_log_')) {
          const logData = localStorage.getItem(key);
          if (logData) {
            const log = JSON.parse(logData);
            importLogs.push(log);
          }
        }
      }

      const stats = {
        total_imports: importLogs.length,
        successful_imports: importLogs.filter(log => log.status === 'completed').length,
        failed_imports: importLogs.filter(log => log.status === 'failed').length,
        in_progress_imports: importLogs.filter(log => log.status === 'in_progress').length,
        total_records_imported: importLogs.reduce((sum, log) => sum + log.successful_records, 0),
        total_records_failed: importLogs.reduce((sum, log) => sum + log.failed_records, 0),
        by_type: {},
        by_source: {}
      };

      // Group by import type
      importLogs.forEach(log => {
        if (!stats.by_type[log.import_type]) {
          stats.by_type[log.import_type] = { total: 0, successful: 0, failed: 0 };
        }
        stats.by_type[log.import_type].total++;
        if (log.status === 'completed') stats.by_type[log.import_type].successful++;
        if (log.status === 'failed') stats.by_type[log.import_type].failed++;
      });

      // Group by source type
      importLogs.forEach(log => {
        if (!stats.by_source[log.source_type]) {
          stats.by_source[log.source_type] = { total: 0, successful: 0, failed: 0 };
        }
        stats.by_source[log.source_type].total++;
        if (log.status === 'completed') stats.by_source[log.source_type].successful++;
        if (log.status === 'failed') stats.by_source[log.source_type].failed++;
      });

      return stats;
    } catch (error) {
      console.error('Error getting import statistics:', error);
      return null;
    }
  }

  // Clear old import logs (older than 30 days)
  async clearOldLogs() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const keys = Object.keys(localStorage);
      let clearedCount = 0;

      for (const key of keys) {
        if (key.startsWith('import_log_')) {
          const logData = localStorage.getItem(key);
          if (logData) {
            const log = JSON.parse(logData);
            if (new Date(log.started_at) < thirtyDaysAgo) {
              localStorage.removeItem(key);
              clearedCount++;
            }
          }
        }
      }

      return clearedCount;
    } catch (error) {
      console.error('Error clearing old logs:', error);
      return 0;
    }
  }
}

// Create singleton instance
const importLogger = new ImportLogger();

export default importLogger;


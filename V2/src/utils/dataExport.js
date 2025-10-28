// Data Export Utilities for JSON and CSV formats

export const exportToJSON = (data, filename) => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return { success: true, message: 'Data exported to JSON successfully' };
  } catch (error) {
    console.error('Export to JSON error:', error);
    return { success: false, message: 'Failed to export data to JSON' };
  }
};

export const exportToCSV = (data, filename, headers = null) => {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      return { success: false, message: 'No data to export' };
    }

    // Get headers from first object if not provided
    const csvHeaders = headers || Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = [
      // Headers
      csvHeaders.join(','),
      // Data rows
      ...data.map(row => 
        csvHeaders.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return { success: true, message: 'Data exported to CSV successfully' };
  } catch (error) {
    console.error('Export to CSV error:', error);
    return { success: false, message: 'Failed to export data to CSV' };
  }
};

// Specific export functions for each master table
export const exportMasterProduct = (data, format = 'json') => {
  const filename = `master_product_${new Date().toISOString().split('T')[0]}`;
  
  // Normalize data structure for consistent export
  const normalizedData = data.map(item => ({
    product_code: item.productCode || item.product_code || '',
    product_name: item.productName || item.product_name || '',
    product_category: item.productCategory || item.product_category || '',
    type_tolerance: item.typeTolerance || item.type_tolerance || '',
    tolerance_grouping: item.toleranceGrouping || item.tolerance_grouping || '',
    status: item.status || 'active',
    created_at: item.createdAt || item.created_at || '',
    updated_at: item.updatedAt || item.updated_at || ''
  }));
  
  const headers = ['product_code', 'product_name', 'product_category', 'type_tolerance', 'tolerance_grouping', 'status', 'created_at', 'updated_at'];
  
  if (format === 'csv') {
    return exportToCSV(normalizedData, filename, headers);
  }
  return exportToJSON(normalizedData, filename);
};

export const exportMasterFormulation = (data, format = 'json') => {
  const filename = `master_formulation_${new Date().toISOString().split('T')[0]}`;
  
  // Normalize data structure for consistent export
  const normalizedData = data.map(item => ({
    formulation_code: item.formulationCode || item.formulation_code || '',
    formulation_name: item.formulationName || item.formulation_name || '',
    sku: item.sku || '',
    total_mass: item.totalMass || item.total_mass || 0,
    total_ingredients: item.totalIngredients || item.total_ingredients || 0,
    status: item.status || 'active',
    created_at: item.createdAt || item.created_at || '',
    updated_at: item.updatedAt || item.updated_at || ''
  }));
  
  const headers = ['formulation_code', 'formulation_name', 'sku', 'total_mass', 'total_ingredients', 'status', 'created_at', 'updated_at'];
  
  if (format === 'csv') {
    return exportToCSV(normalizedData, filename, headers);
  }
  return exportToJSON(normalizedData, filename);
};

export const exportMasterToleranceGrouping = (data, format = 'json') => {
  const filename = `master_tolerance_grouping_${new Date().toISOString().split('T')[0]}`;
  
  // Normalize data structure for consistent export
  const normalizedData = data.map(item => ({
    code: item.code || '',
    name: item.name || '',
    description: item.description || '',
    min_tolerance: item.minTolerance || item.min_tolerance || 0,
    max_tolerance: item.maxTolerance || item.max_tolerance || 0,
    unit: item.unit || 'g',
    status: item.status || 'active',
    created_at: item.createdAt || item.created_at || '',
    updated_at: item.updatedAt || item.updated_at || ''
  }));
  
  const headers = ['code', 'name', 'description', 'min_tolerance', 'max_tolerance', 'unit', 'status', 'created_at', 'updated_at'];
  
  if (format === 'csv') {
    return exportToCSV(normalizedData, filename, headers);
  }
  return exportToJSON(normalizedData, filename);
};

export const exportMasterUser = (data, format = 'json') => {
  const filename = `master_user_${new Date().toISOString().split('T')[0]}`;
  
  // Normalize data structure for consistent export
  const normalizedData = data.map(item => ({
    username: item.username || '',
    name: item.name || '',
    email: item.email || '',
    role: item.role || '',
    status: item.status || 'active',
    last_login: item.lastLogin || item.last_login || '',
    created_at: item.createdAt || item.created_at || '',
    updated_at: item.updatedAt || item.updated_at || ''
  }));
  
  const headers = ['username', 'name', 'email', 'role', 'status', 'last_login', 'created_at', 'updated_at'];
  
  if (format === 'csv') {
    return exportToCSV(normalizedData, filename, headers);
  }
  return exportToJSON(normalizedData, filename);
};

// Export all master data
export const exportAllMasterData = async (data, format = 'json') => {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `all_master_data_${timestamp}`;
    
    if (format === 'csv') {
      // For CSV, we'll create separate files for each table
      const results = [];
      
      if (data.products) {
        results.push(exportMasterProduct(data.products, 'csv'));
      }
      if (data.formulations) {
        results.push(exportMasterFormulation(data.formulations, 'csv'));
      }
      if (data.toleranceGroupings) {
        results.push(exportMasterToleranceGrouping(data.toleranceGroupings, 'csv'));
      }
      if (data.users) {
        results.push(exportMasterUser(data.users, 'csv'));
      }
      
      return { success: true, message: 'All master data exported to CSV files', results };
    } else {
      // For JSON, we'll create one file with all data
      return exportToJSON(data, filename);
    }
  } catch (error) {
    console.error('Export all master data error:', error);
    return { success: false, message: 'Failed to export all master data' };
  }
};

// Data Import Utilities for JSON and CSV formats

export const parseJSONFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve({ success: true, data });
      } catch (error) {
        reject({ success: false, message: 'Invalid JSON format', error });
      }
    };
    
    reader.onerror = () => {
      reject({ success: false, message: 'Failed to read file' });
    };
    
    reader.readAsText(file);
  });
};

export const parseCSVFile = (file, headers = null) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          reject({ success: false, message: 'CSV file is empty' });
          return;
        }
        
        // Parse headers
        const csvHeaders = headers || lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = [];
        
        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          if (values.length === csvHeaders.length) {
            const row = {};
            csvHeaders.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            data.push(row);
          }
        }
        
        resolve({ success: true, data, headers: csvHeaders });
      } catch (error) {
        reject({ success: false, message: 'Invalid CSV format', error });
      }
    };
    
    reader.onerror = () => {
      reject({ success: false, message: 'Failed to read file' });
    };
    
    reader.readAsText(file);
  });
};

// Validate data structure for each master table
export const validateMasterProduct = (data) => {
  const requiredFields = ['product_code', 'product_name', 'product_category', 'type_tolerance'];
  const errors = [];
  
  data.forEach((item, index) => {
    requiredFields.forEach(field => {
      if (!item[field]) {
        errors.push(`Row ${index + 1}: Missing required field '${field}'`);
      }
    });
    
    if (item.product_category && !['raw', 'sfg'].includes(item.product_category)) {
      errors.push(`Row ${index + 1}: Invalid product_category. Must be 'raw' or 'sfg'`);
    }
    
    if (item.type_tolerance && !['high', 'standard', 'low'].includes(item.type_tolerance)) {
      errors.push(`Row ${index + 1}: Invalid type_tolerance. Must be 'high', 'standard', or 'low'`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateMasterFormulation = (data) => {
  const requiredFields = ['formulation_code', 'formulation_name', 'sku'];
  const errors = [];
  
  data.forEach((item, index) => {
    requiredFields.forEach(field => {
      if (!item[field]) {
        errors.push(`Row ${index + 1}: Missing required field '${field}'`);
      }
    });
    
    if (item.total_mass && isNaN(parseFloat(item.total_mass))) {
      errors.push(`Row ${index + 1}: Invalid total_mass. Must be a number`);
    }
    
    if (item.total_ingredients && isNaN(parseInt(item.total_ingredients))) {
      errors.push(`Row ${index + 1}: Invalid total_ingredients. Must be a number`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateMasterToleranceGrouping = (data) => {
  const requiredFields = ['code', 'name', 'min_tolerance', 'max_tolerance', 'unit'];
  const errors = [];
  
  data.forEach((item, index) => {
    requiredFields.forEach(field => {
      if (!item[field]) {
        errors.push(`Row ${index + 1}: Missing required field '${field}'`);
      }
    });
    
    if (item.min_tolerance && isNaN(parseFloat(item.min_tolerance))) {
      errors.push(`Row ${index + 1}: Invalid min_tolerance. Must be a number`);
    }
    
    if (item.max_tolerance && isNaN(parseFloat(item.max_tolerance))) {
      errors.push(`Row ${index + 1}: Invalid max_tolerance. Must be a number`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateMasterUser = (data) => {
  const requiredFields = ['username', 'name', 'email', 'role'];
  const errors = [];
  
  data.forEach((item, index) => {
    requiredFields.forEach(field => {
      if (!item[field]) {
        errors.push(`Row ${index + 1}: Missing required field '${field}'`);
      }
    });
    
    if (item.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)) {
      errors.push(`Row ${index + 1}: Invalid email format`);
    }
    
    if (item.role && !['admin', 'supervisor', 'operator'].includes(item.role)) {
      errors.push(`Row ${index + 1}: Invalid role. Must be 'admin', 'supervisor', or 'operator'`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Import data with validation
export const importMasterProduct = async (file, format = 'json') => {
  try {
    let result;
    
    if (format === 'csv') {
      result = await parseCSVFile(file);
    } else {
      result = await parseJSONFile(file);
    }
    
    if (!result.success) {
      return result;
    }
    
    const validation = validateMasterProduct(result.data);
    if (!validation.isValid) {
      return {
        success: false,
        message: 'Data validation failed',
        errors: validation.errors
      };
    }
    
    return {
      success: true,
      data: result.data,
      message: `Successfully imported ${result.data.length} product records`
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to import product data',
      error: error.message
    };
  }
};

export const importMasterFormulation = async (file, format = 'json') => {
  try {
    let result;
    
    if (format === 'csv') {
      result = await parseCSVFile(file);
    } else {
      result = await parseJSONFile(file);
    }
    
    if (!result.success) {
      return result;
    }
    
    const validation = validateMasterFormulation(result.data);
    if (!validation.isValid) {
      return {
        success: false,
        message: 'Data validation failed',
        errors: validation.errors
      };
    }
    
    return {
      success: true,
      data: result.data,
      message: `Successfully imported ${result.data.length} formulation records`
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to import formulation data',
      error: error.message
    };
  }
};

export const importMasterToleranceGrouping = async (file, format = 'json') => {
  try {
    let result;
    
    if (format === 'csv') {
      result = await parseCSVFile(file);
    } else {
      result = await parseJSONFile(file);
    }
    
    if (!result.success) {
      return result;
    }
    
    const validation = validateMasterToleranceGrouping(result.data);
    if (!validation.isValid) {
      return {
        success: false,
        message: 'Data validation failed',
        errors: validation.errors
      };
    }
    
    return {
      success: true,
      data: result.data,
      message: `Successfully imported ${result.data.length} tolerance grouping records`
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to import tolerance grouping data',
      error: error.message
    };
  }
};

export const importMasterUser = async (file, format = 'json') => {
  try {
    let result;
    
    if (format === 'csv') {
      result = await parseCSVFile(file);
    } else {
      result = await parseJSONFile(file);
    }
    
    if (!result.success) {
      return result;
    }
    
    const validation = validateMasterUser(result.data);
    if (!validation.isValid) {
      return {
        success: false,
        message: 'Data validation failed',
        errors: validation.errors
      };
    }
    
    return {
      success: true,
      data: result.data,
      message: `Successfully imported ${result.data.length} user records`
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to import user data',
      error: error.message
    };
  }
};

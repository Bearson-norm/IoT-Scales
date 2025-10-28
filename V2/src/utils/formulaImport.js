/**
 * Utility untuk mengimpor data dari file Formula to Input
 * Format: formulationCode,formulationName,productCode,productName,targetMass,totalMass,uom,totalIngredient,status,mustFollowOrder,min,max,toleranceGroupingName,toleranceType,maxAllowedWeighingQty,implementToleranceGrouping,instruction
 */

import importLogger from './importLogger.js';

/**
 * Parse CSV content dari file Formula to Input
 * @param {string} csvContent - Konten CSV file
 * @returns {Array} Array of parsed data
 */
export function parseFormulaCSV(csvContent) {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }
    }
    
    return data;
}

/**
 * Transform data dari format Formula to Input ke format database
 * @param {Array} csvData - Data dari CSV
 * @returns {Object} Object dengan products dan formulations
 */
export function transformFormulaData(csvData) {
    const products = new Map();
    const formulations = new Map();
    const toleranceGroupings = new Map();
    
    // Group data by formulation
    const formulationGroups = new Map();
    
    csvData.forEach(row => {
        const formulationCode = row.formulationCode;
        
        if (!formulationGroups.has(formulationCode)) {
            formulationGroups.set(formulationCode, {
                formulationCode: row.formulationCode,
                formulationName: row.formulationName,
                totalMass: parseFloat(row.totalMass) || 0,
                uom: row.uom || 'g',
                totalIngredient: parseInt(row.totalIngredient) || 0,
                status: row.status || 'active',
                mustFollowOrder: row.mustFollowOrder === 'TRUE',
                min: parseFloat(row.min) || 0,
                max: parseFloat(row.max) || 0,
                toleranceGroupingName: row.toleranceGroupingName,
                toleranceType: row.toleranceType || 'mass',
                maxAllowedWeighingQty: parseFloat(row.maxAllowedWeighingQty) || 0,
                implementToleranceGrouping: row.implementToleranceGrouping === 'TRUE',
                instruction: row.instruction || '',
                ingredients: []
            });
        }
        
        // Add ingredient to formulation
        const ingredient = {
            productCode: row.productCode,
            productName: row.productName,
            targetMass: parseFloat(row.targetMass) || 0
        };
        
        formulationGroups.get(formulationCode).ingredients.push(ingredient);
        
        // Collect unique products
        if (!products.has(row.productCode)) {
            products.set(row.productCode, {
                productCode: row.productCode,
                productName: row.productName,
                description: `Imported from Formula to Input - ${row.productName}`,
                category: 'Imported',
                unit: row.uom || 'g',
                status: 'active',
                createdBy: 'system'
            });
        }
        
        // Collect unique tolerance groupings
        if (row.toleranceGroupingName && !toleranceGroupings.has(row.toleranceGroupingName)) {
            toleranceGroupings.set(row.toleranceGroupingName, {
                name: row.toleranceGroupingName,
                description: `Imported tolerance grouping for ${row.toleranceGroupingName}`,
                toleranceType: row.toleranceType || 'mass',
                minTolerance: 0,
                maxTolerance: 0,
                status: 'active'
            });
        }
    });
    
    // Convert formulations map to array
    const formulationsArray = Array.from(formulationGroups.values());
    
    return {
        products: Array.from(products.values()),
        formulations: formulationsArray,
        toleranceGroupings: Array.from(toleranceGroupings.values())
    };
}

/**
 * Import data dari file Formula to Input ke database
 * @param {File} file - File yang akan diimpor
 * @param {string} userId - ID user yang melakukan import
 * @returns {Promise<Object>} Result import
 */
export async function importFormulaFile(file, userId) {
    try {
        // Start import logging
        const importLog = await importLogger.startImport('master_formulation', 'file', file.name, null, userId);
        
        const csvContent = await readFileContent(file);
        const csvData = parseFormulaCSV(csvContent);
        const transformedData = transformFormulaData(csvData);
        
        let totalRecords = 0;
        let successfulRecords = 0;
        let failedRecords = 0;
        const errors = [];
        
        // Import tolerance groupings first
        for (const toleranceGrouping of transformedData.toleranceGroupings) {
            try {
                totalRecords++;
                // Simulate database insert
                console.log('Importing tolerance grouping:', toleranceGrouping.name);
                successfulRecords++;
            } catch (error) {
                failedRecords++;
                errors.push(`Tolerance Grouping ${toleranceGrouping.name}: ${error.message}`);
            }
        }
        
        // Import products
        for (const product of transformedData.products) {
            try {
                totalRecords++;
                // Simulate database insert
                console.log('Importing product:', product.productCode);
                successfulRecords++;
            } catch (error) {
                failedRecords++;
                errors.push(`Product ${product.productCode}: ${error.message}`);
            }
        }
        
        // Import formulations
        for (const formulation of transformedData.formulations) {
            try {
                totalRecords++;
                // Simulate database insert
                console.log('Importing formulation:', formulation.formulationCode);
                successfulRecords++;
            } catch (error) {
                failedRecords++;
                errors.push(`Formulation ${formulation.formulationCode}: ${error.message}`);
            }
        }
        
        // Complete import logging
        await importLogger.completeImport(importLog.id, successfulRecords, failedRecords, errors.length > 0 ? errors : null);
        
        return {
            success: true,
            totalRecords,
            successfulRecords,
            failedRecords,
            errors,
            data: transformedData
        };
        
    } catch (error) {
        console.error('Error importing formula file:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Read file content
 * @param {File} file - File to read
 * @returns {Promise<string>} File content
 */
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

/**
 * Validate formula file format
 * @param {File} file - File to validate
 * @returns {Promise<Object>} Validation result
 */
export async function validateFormulaFile(file) {
    try {
        const csvContent = await readFileContent(file);
        const csvData = parseFormulaCSV(csvContent);
        
        if (csvData.length === 0) {
            return {
                valid: false,
                error: 'File kosong atau format tidak valid'
            };
        }
        
        // Check required columns
        const requiredColumns = [
            'formulationCode', 'formulationName', 'productCode', 'productName',
            'targetMass', 'totalMass', 'uom', 'status'
        ];
        
        const firstRow = csvData[0];
        const missingColumns = requiredColumns.filter(col => !(col in firstRow));
        
        if (missingColumns.length > 0) {
            return {
                valid: false,
                error: `Kolom yang diperlukan tidak ditemukan: ${missingColumns.join(', ')}`
            };
        }
        
        // Count unique formulations and products
        const uniqueFormulations = new Set(csvData.map(row => row.formulationCode));
        const uniqueProducts = new Set(csvData.map(row => row.productCode));
        
        return {
            valid: true,
            totalRows: csvData.length,
            uniqueFormulations: uniqueFormulations.size,
            uniqueProducts: uniqueProducts.size,
            preview: csvData.slice(0, 5) // First 5 rows as preview
        };
        
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}

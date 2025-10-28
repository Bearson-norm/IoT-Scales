const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'FLB_MOWS',
  password: 'Admin123',
  port: 5432,
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// API Routes

// Get all products (SKU/Finished Products)
app.get('/api/products', async (req, res) => {
  try {
    const query = `
      SELECT 
        mp.id,
        mp.product_code,
        mp.product_name,
        mp.product_category,
        mp.type_tolerance,
        mp.status,
        mp.created_at,
        mp.updated_at,
        mtg.code as tolerance_grouping_code,
        mtg.name as tolerance_grouping_name
      FROM master_product mp
      LEFT JOIN master_tolerance_grouping mtg ON mp.tolerance_grouping_id = mtg.id
      WHERE mp.product_category = 'sfg'
      ORDER BY mp.product_name
    `;
    
    const result = await pool.query(query);
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      details: error.message
    });
  }
});

// Get all ingredients (Raw Materials)
app.get('/api/ingredients', async (req, res) => {
  try {
    const query = `
      SELECT 
        mi.id,
        mi.ingredient_code,
        mi.ingredient_name,
        mi.category,
        mi.type_tolerance,
        mi.unit,
        mi.status,
        mi.created_at,
        mi.updated_at,
        mtg.code as tolerance_grouping_code,
        mtg.name as tolerance_grouping_name
      FROM master_ingredients mi
      LEFT JOIN master_tolerance_grouping mtg ON mi.tolerance_grouping_id = mtg.id
      ORDER BY mi.ingredient_name
    `;
    
    const result = await pool.query(query);
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ingredients',
      details: error.message
    });
  }
});

// Get all formulations
app.get('/api/formulations', async (req, res) => {
  try {
    const query = `
      SELECT 
        mf.id,
        mf.formulation_code,
        mf.formulation_name,
        mf.sku as sku_code,
        mf.total_mass,
        mf.total_ingredients,
        mf.status,
        mf.created_at,
        mf.updated_at
      FROM master_formulation mf
      ORDER BY mf.formulation_name
    `;
    
    const result = await pool.query(query);
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching formulations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch formulations',
      details: error.message
    });
  }
});

// Get formulation ingredients
app.get('/api/formulations/:id/ingredients', async (req, res) => {
  try {
    const formulationId = req.params.id;
    const query = `
      SELECT 
        mfi.id,
        mfi.target_mass,
        mfi.created_at,
        mfi.updated_at,
        mp.product_code as ingredient_code,
        mp.product_name as ingredient_name,
        mp.product_category as category,
        mp.type_tolerance,
        mtg.name as tolerance_grouping_name
      FROM master_formulation_ingredients mfi
      JOIN master_product mp ON mfi.product_id = mp.id
      LEFT JOIN master_tolerance_grouping mtg ON mp.tolerance_grouping_id = mtg.id
      WHERE mfi.formulation_id = $1 AND mp.product_category = 'raw'
      ORDER BY mfi.created_at
    `;
    
    const result = await pool.query(query, [formulationId]);
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching formulation ingredients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch formulation ingredients',
      details: error.message
    });
  }
});

// Get tolerance groupings
app.get('/api/tolerance-groupings', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        code,
        name,
        description,
        min_tolerance,
        max_tolerance,
        unit,
        status,
        created_at,
        updated_at
      FROM master_tolerance_grouping
      ORDER BY name
    `;
    
    const result = await pool.query(query);
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching tolerance groupings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tolerance groupings',
      details: error.message
    });
  }
});

// Create new product
app.post('/api/products', async (req, res) => {
  try {
    const { productCode, productName, productCategory, typeTolerance, toleranceGroupingId, status } = req.body;
    
    const query = `
      INSERT INTO master_product (product_code, product_name, product_category, type_tolerance, tolerance_grouping_id, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(query, [productCode, productName, productCategory, typeTolerance, toleranceGroupingId, status]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create product',
      details: error.message
    });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const { productCode, productName, productCategory, typeTolerance, toleranceGroupingId, status } = req.body;
    
    const query = `
      UPDATE master_product 
      SET product_code = $1, product_name = $2, product_category = $3, type_tolerance = $4, tolerance_grouping_id = $5, status = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    
    const result = await pool.query(query, [productCode, productName, productCategory, typeTolerance, toleranceGroupingId, status, productId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update product',
      details: error.message
    });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    
    const query = 'DELETE FROM master_product WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [productId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete product',
      details: error.message
    });
  }
});

// Create new formulation
app.post('/api/formulations', async (req, res) => {
  try {
    const { formulationCode, formulationName, sku, totalMass, totalIngredients, status } = req.body;
    
    const query = `
      INSERT INTO master_formulation (formulation_code, formulation_name, sku, total_mass, total_ingredients, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(query, [formulationCode, formulationName, sku, totalMass || 0, totalIngredients || 0, status || 'active']);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Formulation created successfully'
    });
  } catch (error) {
    console.error('Error creating formulation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create formulation',
      details: error.message
    });
  }
});

// Update formulation
app.put('/api/formulations/:id', async (req, res) => {
  try {
    const formulationId = req.params.id;
    const { formulationCode, formulationName, sku, totalMass, totalIngredients, status } = req.body;
    
    const query = `
      UPDATE master_formulation 
      SET formulation_code = $1, formulation_name = $2, sku = $3, total_mass = $4, total_ingredients = $5, status = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    
    const result = await pool.query(query, [formulationCode, formulationName, sku, totalMass, totalIngredients, status, formulationId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Formulation not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Formulation updated successfully'
    });
  } catch (error) {
    console.error('Error updating formulation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update formulation',
      details: error.message
    });
  }
});

// Delete formulation
app.delete('/api/formulations/:id', async (req, res) => {
  try {
    const formulationId = req.params.id;
    
    const query = 'DELETE FROM master_formulation WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [formulationId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Formulation not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Formulation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting formulation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete formulation',
      details: error.message
    });
  }
});

// Create new ingredient
app.post('/api/ingredients', async (req, res) => {
  try {
    const { ingredientCode, ingredientName, category, typeTolerance, toleranceGroupingId, unit, status } = req.body;
    
    const query = `
      INSERT INTO master_ingredients (ingredient_code, ingredient_name, category, type_tolerance, tolerance_grouping_id, unit, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await pool.query(query, [ingredientCode, ingredientName, category, typeTolerance, toleranceGroupingId, unit, status]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Ingredient created successfully'
    });
  } catch (error) {
    console.error('Error creating ingredient:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create ingredient',
      details: error.message
    });
  }
});

// Update ingredient
app.put('/api/ingredients/:id', async (req, res) => {
  try {
    const ingredientId = req.params.id;
    const { ingredientCode, ingredientName, category, typeTolerance, toleranceGroupingId, unit, status } = req.body;
    
    const query = `
      UPDATE master_ingredients 
      SET ingredient_code = $1, ingredient_name = $2, category = $3, type_tolerance = $4, tolerance_grouping_id = $5, unit = $6, status = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;
    
    const result = await pool.query(query, [ingredientCode, ingredientName, category, typeTolerance, toleranceGroupingId, unit, status, ingredientId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Ingredient updated successfully'
    });
  } catch (error) {
    console.error('Error updating ingredient:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update ingredient',
      details: error.message
    });
  }
});

// Delete ingredient
app.delete('/api/ingredients/:id', async (req, res) => {
  try {
    const ingredientId = req.params.id;
    
    const query = 'DELETE FROM master_ingredients WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [ingredientId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Ingredient deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete ingredient',
      details: error.message
    });
  }
});

// Preview import endpoint
app.post('/api/preview-import', async (req, res) => {
  const multer = require('multer');
  const upload = multer({ dest: 'uploads/' });
  
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: 'File upload failed',
        details: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const fs = require('fs');
    const path = require('path');
    const csv = require('csv-parser');

    const fullRefresh = req.body.fullRefresh === 'true';

    try {
      const filename = req.file.originalname;
      const filepath = req.file.path;
      
      console.log(`🔍 Previewing import from: ${filename}`);
      console.log(`🔄 Full Refresh Mode: ${fullRefresh ? 'ENABLED' : 'DISABLED'}`);
      
      // Read and parse CSV
      const csvData = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(filepath)
          .pipe(csv())
          .on('data', (row) => csvData.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
      
      console.log(`📊 Parsed ${csvData.length} records from CSV`);
      
      // Track changes for preview (without modifying database)
      const preview = {
        total_records: csvData.length,
        new_products: 0,
        updated_products: 0,
        new_formulations: 0,
        new_ingredients: 0,
        full_refresh: fullRefresh,
        changes: []
      };
      
      // Process products and formulations
      const productsMap = new Map();
      const formulationsMap = new Map();
      const formulationIngredients = [];
      
      // Parse CSV data
      for (const row of csvData) {
        const formulationCode = row.formulationCode;
        const formulationName = row.formulationName;
        const productCode = row.productCode;
        const productName = row.productName;
        const targetMass = parseFloat(row.targetMass) || 0;
        
        // Track unique products
        if (!productsMap.has(productCode)) {
          productsMap.set(productCode, {
            code: productCode,
            name: productName,
            category: 'raw',
            type_tolerance: 'standard'
          });
        }
        
        // Track unique formulations
        if (!formulationsMap.has(formulationCode)) {
          formulationsMap.set(formulationCode, {
            code: formulationCode,
            name: formulationName
          });
        }
        
        // Track formulation ingredients
        formulationIngredients.push({
          formulationCode,
          productCode,
          targetMass
        });
      }
      
      // Check existing products (preview only)
      for (const [code, product] of productsMap) {
        const existing = await pool.query(
          'SELECT id, product_name FROM master_product WHERE product_code = $1',
          [code]
        );
        
        if (fullRefresh) {
          // In full refresh mode, all will be new
          preview.new_products++;
          preview.changes.push({
            type: 'new',
            table: 'master_product',
            description: `Will add new product ${code}: ${product.name}`,
            new_value: product.name,
            note: 'Existing products will be DELETED in full refresh mode'
          });
        } else {
          // Normal mode: check if exists
          if (existing.rows.length > 0) {
            const existingProduct = existing.rows[0];
            if (existingProduct.product_name !== product.name) {
              preview.updated_products++;
              preview.changes.push({
                type: 'updated',
                table: 'master_product',
                description: `Updated product ${code}`,
                old_value: existingProduct.product_name,
                new_value: product.name
              });
            }
          } else {
            preview.new_products++;
            preview.changes.push({
              type: 'new',
              table: 'master_product',
              description: `Added new product ${code}: ${product.name}`,
              new_value: product.name
            });
          }
        }
      }
      
      // Check existing formulations (preview only)
      for (const [code, formulation] of formulationsMap) {
        const existing = await pool.query(
          'SELECT id FROM master_formulation WHERE formulation_code = $1',
          [code]
        );
        
        if (existing.rows.length === 0) {
          // Insert new formulation
          preview.new_formulations++;
          preview.changes.push({
            type: 'new',
            table: 'master_formulation',
            description: `Added new formulation ${code}`,
            new_value: formulation.name
          });
        }
      }
      
      // Get all formulations and products for linking (preview only)
      const { rows: formulations } = await pool.query('SELECT id, formulation_code FROM master_formulation');
      const { rows: products } = await pool.query('SELECT id, product_code FROM master_product WHERE product_category = $1', ['raw']);
      
      const formulationMap = new Map(formulations.map(f => [f.formulation_code, f.id]));
      const productMap = new Map(products.map(p => [p.product_code, p.id]));
      
      // Count formulation ingredients (preview only)
      let successfulIngredients = 0;
      
      for (const fi of formulationIngredients) {
        const formulationId = formulationMap.get(fi.formulationCode);
        const productId = productMap.get(fi.productCode);
        
        if (formulationId && productId) {
          successfulIngredients++;
        }
      }
      
      preview.new_ingredients = successfulIngredients;
      
      // Clean up uploaded file
      fs.unlinkSync(filepath);
      
      console.log(`✅ Preview completed successfully`);
      console.log(`📊 Preview Summary: ${preview.new_products} new products, ${preview.updated_products} updated products, ${preview.new_formulations} new formulations, ${successfulIngredients} ingredients`);
      
      res.json({
        success: true,
        message: 'Preview completed successfully',
        preview: preview,
        filename: filename
      });
      
    } catch (error) {
      console.error('❌ Preview failed:', error);
      
      // Clean up uploaded file
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
      
      res.status(500).json({
        success: false,
        error: 'Preview failed',
        details: error.message
      });
    }
  });
});

// Import database endpoint
app.post('/api/import-database', async (req, res) => {
  const multer = require('multer');
  const upload = multer({ dest: 'uploads/' });
  
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: 'File upload failed',
        details: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const fs = require('fs');
    const path = require('path');
    const csv = require('csv-parser');

    const fullRefresh = req.body.fullRefresh === 'true';

    try {
      const filename = req.file.originalname;
      const filepath = req.file.path;
      
      console.log(`🔄 Starting database import from: ${filename}`);
      console.log(`🔄 Full Refresh Mode: ${fullRefresh ? 'ENABLED' : 'DISABLED'}`);
      
      // Start transaction
      await pool.query('BEGIN');

      // Full Refresh: Delete existing data before import
      if (fullRefresh) {
        console.log('🗑️  Full Refresh: Deleting existing data...');
        await pool.query('DELETE FROM master_formulation_ingredients');
        console.log('✅ Deleted master_formulation_ingredients');
        await pool.query('DELETE FROM master_formulation');
        console.log('✅ Deleted master_formulation');
        await pool.query("DELETE FROM master_product WHERE product_category = 'raw'");
        console.log('✅ Deleted master_product (raw only)');
      }
      
      // Create import log entry
      const logResult = await pool.query(
        `INSERT INTO import_logs (import_type, source_type, source_name, status, imported_by, started_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING id`,
        ['master_formulation', 'file', filename, 'in_progress', 'b55f0171-68a1-451c-a428-0c160332a561']
      );
      
      const logId = logResult.rows[0].id;
      
      // Read and parse CSV
      const csvData = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(filepath)
          .pipe(csv())
          .on('data', (row) => csvData.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
      
      console.log(`📊 Parsed ${csvData.length} records from CSV`);
      
      // Track changes for comparison
      const comparison = {
        total_records: csvData.length,
        new_products: 0,
        updated_products: 0,
        new_formulations: 0,
        new_ingredients: 0,
        changes: []
      };
      
      // Process products and formulations
      const productsMap = new Map();
      const formulationsMap = new Map();
      const formulationIngredients = [];
      
      // Parse CSV data
      for (const row of csvData) {
        const formulationCode = row.formulationCode;
        const formulationName = row.formulationName;
        const productCode = row.productCode;
        const productName = row.productName;
        const targetMass = parseFloat(row.targetMass) || 0;
        
        // Track unique products
        if (!productsMap.has(productCode)) {
          productsMap.set(productCode, {
            code: productCode,
            name: productName,
            category: 'raw',
            type_tolerance: 'standard'
          });
        }
        
        // Track unique formulations
        if (!formulationsMap.has(formulationCode)) {
          formulationsMap.set(formulationCode, {
            code: formulationCode,
            name: formulationName
          });
        }
        
        // Track formulation ingredients
        formulationIngredients.push({
          formulationCode,
          productCode,
          targetMass
        });
      }
      
      // Process products
      for (const [code, product] of productsMap) {
        if (fullRefresh) {
          // Full refresh: always insert new
          await pool.query(
            `INSERT INTO master_product (product_code, product_name, product_category, type_tolerance, status)
             VALUES ($1, $2, $3, $4, 'active')`,
            [product.code, product.name, product.category, product.type_tolerance]
          );
          
          comparison.new_products++;
          comparison.changes.push({
            type: 'new',
            table: 'master_product',
            description: `Added new product ${code}: ${product.name}`,
            new_value: product.name
          });
        } else {
          // Normal mode: check if exists
          const existing = await pool.query(
            'SELECT id, product_name FROM master_product WHERE product_code = $1',
            [code]
          );
          
          if (existing.rows.length > 0) {
            // Update existing product if name changed
            const existingProduct = existing.rows[0];
            if (existingProduct.product_name !== product.name) {
              await pool.query(
                `UPDATE master_product 
                 SET product_name = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE product_code = $2`,
                [product.name, code]
              );
              
              comparison.updated_products++;
              comparison.changes.push({
                type: 'updated',
                table: 'master_product',
                description: `Updated product ${code}`,
                old_value: existingProduct.product_name,
                new_value: product.name
              });
            }
          } else {
            // Insert new product
            await pool.query(
              `INSERT INTO master_product (product_code, product_name, product_category, type_tolerance, status)
               VALUES ($1, $2, $3, $4, 'active')`,
              [product.code, product.name, product.category, product.type_tolerance]
            );
            
            comparison.new_products++;
            comparison.changes.push({
              type: 'new',
              table: 'master_product',
              description: `Added new product ${code}: ${product.name}`,
              new_value: product.name
            });
          }
        }
      }
      
      // Process formulations
      for (const [code, formulation] of formulationsMap) {
        if (fullRefresh) {
          // Full refresh: always insert new
          await pool.query(
            `INSERT INTO master_formulation (formulation_code, formulation_name, sku, total_mass, total_ingredients, status)
             VALUES ($1, $2, $3, 0, 0, 'active')`,
            [formulation.code, formulation.name, formulation.code]
          );
          
          comparison.new_formulations++;
          comparison.changes.push({
            type: 'new',
            table: 'master_formulation',
            description: `Added new formulation ${code}`,
            new_value: formulation.name
          });
        } else {
          // Normal mode: check if exists
          const existing = await pool.query(
            'SELECT id FROM master_formulation WHERE formulation_code = $1',
            [code]
          );
          
          if (existing.rows.length === 0) {
            // Insert new formulation
            await pool.query(
              `INSERT INTO master_formulation (formulation_code, formulation_name, sku, total_mass, total_ingredients, status)
               VALUES ($1, $2, $3, 0, 0, 'active')`,
              [formulation.code, formulation.name, formulation.code]
            );
            
            comparison.new_formulations++;
            comparison.changes.push({
              type: 'new',
              table: 'master_formulation',
              description: `Added new formulation ${code}`,
              new_value: formulation.name
            });
          }
        }
      }
      
      // Get all formulations and products for linking
      const { rows: formulations } = await pool.query('SELECT id, formulation_code FROM master_formulation');
      const { rows: products } = await pool.query('SELECT id, product_code FROM master_product WHERE product_category = $1', ['raw']);
      
      const formulationMap = new Map(formulations.map(f => [f.formulation_code, f.id]));
      const productMap = new Map(products.map(p => [p.product_code, p.id]));
      
      // Process formulation ingredients
      let successfulIngredients = 0;
      let failedIngredients = 0;
      
      for (const fi of formulationIngredients) {
        const formulationId = formulationMap.get(fi.formulationCode);
        const productId = productMap.get(fi.productCode);
        
        if (formulationId && productId) {
          try {
            await pool.query(
              `INSERT INTO master_formulation_ingredients (formulation_id, product_id, target_mass)
               VALUES ($1, $2, $3)
               ON CONFLICT (formulation_id, product_id) DO UPDATE
               SET target_mass = EXCLUDED.target_mass, updated_at = CURRENT_TIMESTAMP`,
              [formulationId, productId, fi.targetMass]
            );
            successfulIngredients++;
          } catch (err) {
            console.error(`Error inserting ingredient for ${fi.formulationCode}: ${fi.productCode}:`, err.message);
            failedIngredients++;
          }
        } else {
          failedIngredients++;
        }
      }
      
      comparison.new_ingredients = successfulIngredients;
      
      // Update total_ingredients and total_mass for each formulation
      for (const [code, formulation] of formulationsMap) {
        const formulationId = formulationMap.get(code);
        if (formulationId) {
          // Count ingredients for this formulation
          const countResult = await pool.query(
            'SELECT COUNT(*) as count, COALESCE(SUM(target_mass), 0) as total FROM master_formulation_ingredients WHERE formulation_id = $1',
            [formulationId]
          );
          
          const ingredientCount = parseInt(countResult.rows[0].count) || 0;
          const totalMass = parseFloat(countResult.rows[0].total) || 0;
          
          // Update total_ingredients and total_mass
          await pool.query(
            'UPDATE master_formulation SET total_ingredients = $1, total_mass = $2 WHERE id = $3',
            [ingredientCount, totalMass, formulationId]
          );
          
          console.log(`✅ Updated formulation ${code}: total_ingredients = ${ingredientCount}, total_mass = ${totalMass}`);
        }
      }
      
      // Update import log
      await pool.query(
        `UPDATE import_logs 
         SET status = 'completed', total_records = $1, successful_records = $2, failed_records = $3, completed_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [csvData.length, successfulIngredients, failedIngredients, logId]
      );
      
      // Commit transaction
      await pool.query('COMMIT');
      
      // Clean up uploaded file
      fs.unlinkSync(filepath);
      
      console.log(`✅ Database import completed successfully`);
      console.log(`📊 Summary: ${comparison.new_products} new products, ${comparison.updated_products} updated products, ${comparison.new_formulations} new formulations, ${successfulIngredients} ingredients`);
      
      res.json({
        success: true,
        message: 'Database imported successfully',
        comparison: comparison,
        filename: filename
      });
      
    } catch (error) {
      // Rollback transaction
      await pool.query('ROLLBACK');
      
      console.error('❌ Database import failed:', error);
      
      // Update import log with error
      if (logId) {
        await pool.query(
          `UPDATE import_logs 
           SET status = 'failed', error_details = $1, completed_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [error.message, logId]
        );
      }
      
      // Clean up uploaded file
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
      
      res.status(500).json({
        success: false,
        error: 'Database import failed',
        details: error.message
      });
    }
  });
});

// Get import logs endpoint
app.get('/api/import-logs', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        import_type,
        source_type,
        source_name,
        total_records,
        successful_records,
        failed_records,
        error_details,
        status,
        started_at,
        completed_at,
        created_at
      FROM import_logs
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching import logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch import logs',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      success: true,
      message: 'Database connection is healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: error.message
    });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await pool.end();
  process.exit(0);
});

module.exports = app;

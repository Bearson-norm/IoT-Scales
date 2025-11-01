// Script to populate formulation ingredients from products
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'Admin123',
  host: 'localhost',
  database: 'FLB_MOWS',
  port: 5432
});

async function populateFormulationIngredients() {
  try {
    console.log('🔄 Connecting to database...');
    await pool.query('SELECT 1');
    console.log('✅ Connected to database');

    // Get all formulations
    const formulationsResult = await pool.query('SELECT id, formulation_code, total_ingredients FROM master_formulation');
    const formulations = formulationsResult.rows;
    console.log(`📊 Found ${formulations.length} formulations`);

    // Get all products
    const productsResult = await pool.query('SELECT id, product_code, product_name FROM master_product LIMIT 20');
    const products = productsResult.rows;
    console.log(`📦 Found ${products.length} products to use as ingredients`);

    for (const formulation of formulations) {
      console.log(`\n🔍 Processing formulation: ${formulation.formulation_code}`);
      
      // Check if already has ingredients
      const existingIngredients = await pool.query(
        'SELECT COUNT(*) as count FROM master_formulation_ingredients WHERE formulation_id = $1',
        [formulation.id]
      );
      
      const count = parseInt(existingIngredients.rows[0].count);
      console.log(`   Existing ingredients: ${count}`);
      
      if (count === 0 && formulation.total_ingredients > 0) {
        console.log(`   ⚠️ No ingredients found, adding sample ingredients...`);
        
        // Add sample ingredients (first few products with random target mass)
        const numIngredients = Math.min(formulation.total_ingredients, 5);
        const selectedProducts = products.slice(0, numIngredients);
        
        for (const product of selectedProducts) {
          const targetMass = (Math.random() * 1000 + 100).toFixed(2);
          
          try {
            await pool.query(
              `INSERT INTO master_formulation_ingredients (formulation_id, product_id, target_mass)
               VALUES ($1, $2, $3)
               ON CONFLICT (formulation_id, product_id) DO NOTHING`,
              [formulation.id, product.id, targetMass]
            );
            console.log(`   ✅ Added ingredient: ${product.product_name} (${targetMass}g)`);
          } catch (err) {
            console.log(`   ⚠️ Failed to add ingredient ${product.product_name}:`, err.message);
          }
        }
      } else if (count > 0) {
        console.log(`   ✅ Already has ${count} ingredients`);
      }
    }

    // Refresh total_ingredients count
    console.log('\n🔄 Updating total_ingredients count...');
    for (const formulation of formulations) {
      const countResult = await pool.query(
        'SELECT COUNT(*) as count FROM master_formulation_ingredients WHERE formulation_id = $1',
        [formulation.id]
      );
      const actualCount = parseInt(countResult.rows[0].count);
      
      await pool.query(
        'UPDATE master_formulation SET total_ingredients = $1 WHERE id = $2',
        [actualCount, formulation.id]
      );
      console.log(`   ✅ Updated ${formulation.formulation_code}: ${formulation.total_ingredients} → ${actualCount}`);
    }

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

populateFormulationIngredients();

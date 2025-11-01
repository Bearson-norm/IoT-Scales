# Database Structure Update - IoT Scales V2

## 📋 **Overview**
Dokumentasi perubahan struktur database untuk memperbaiki master product dan master formulation sesuai dengan kebutuhan produksi.

## 🎯 **Perubahan yang Dilakukan**

### **Sebelum (Struktur Lama)**
- **Master Product**: Menampilkan bahan baku (SALTNIC A6H1007, MINT FLAVOR, etc.)
- **Master Formulation**: Menampilkan formulasi dengan total berat

### **Sesudah (Struktur Baru)**
- **Master Product**: Menampilkan produk hasil produksi (SKU) seperti "MIXING - ICY MINT"
- **Master Formulation**: Menampilkan SKU dengan bahan-bahan (ingredients) yang digunakan
- **Master Ingredients**: Tabel baru untuk bahan baku/raw materials

## 🔧 **Struktur Database Baru**

### **1. Master Products (SKU/Finished Products)**
```sql
CREATE TABLE master_product (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_category VARCHAR(20) NOT NULL CHECK (product_category IN ('raw', 'sfg')),
    type_tolerance VARCHAR(20) NOT NULL CHECK (type_tolerance IN ('high', 'standard', 'low')),
    tolerance_grouping_id UUID REFERENCES master_tolerance_grouping(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Data Master Products:**
- **SKU001** - MIXING - ICY MINT (sfg, high precision)
- **SKU002** - MIXING - FOOM X A (sfg, high precision)
- **SKU003** - MIXING - VANILLA CREAM (sfg, high precision)

### **2. Master Ingredients (Raw Materials)**
```sql
CREATE TABLE master_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_code VARCHAR(50) UNIQUE NOT NULL,
    ingredient_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('flavor', 'base', 'additive', 'other')),
    type_tolerance VARCHAR(20) NOT NULL CHECK (type_tolerance IN ('high', 'standard', 'low')),
    tolerance_grouping_id UUID REFERENCES master_tolerance_grouping(id),
    unit VARCHAR(10) NOT NULL DEFAULT 'g',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Data Master Ingredients:**
- **ING001** - SALTNIC A6H1007 (additive, high precision)
- **ING002** - PROPYLENE GLYCOL (PG) (base, standard precision)
- **ING003** - VEGETABLE GLYCERIN (VG) (base, standard precision)
- **ING004** - MINT FLAVOR (flavor, high precision)
- **ING005** - CREAM BASE (base, low precision)

### **3. Master Formulations (SKU with Ingredients)**
```sql
CREATE TABLE master_formulation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formulation_code VARCHAR(50) UNIQUE NOT NULL,
    formulation_name VARCHAR(255) NOT NULL,
    sku VARCHAR(50) NOT NULL, -- Foreign key reference to master_product
    total_mass DECIMAL(12,3) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Data Master Formulations:**
- **FML001** - MIXING - ICY MINT (SKU001, 99,000g)
- **FML002** - MIXING - FOOM X A (SKU002, 36,000g)
- **FML003** - MIXING - VANILLA CREAM (SKU003, 50,000g)

### **4. Formulation Ingredients (Many-to-Many Relationship)**
```sql
CREATE TABLE formulation_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formulation_id UUID NOT NULL REFERENCES master_formulation(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES master_ingredients(id) ON DELETE CASCADE,
    target_weight DECIMAL(12,3) NOT NULL,
    tolerance_min DECIMAL(12,3) NOT NULL DEFAULT 0,
    tolerance_max DECIMAL(12,3) NOT NULL DEFAULT 0,
    unit VARCHAR(10) NOT NULL DEFAULT 'g',
    sequence_order INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(formulation_id, ingredient_id)
);
```

## 📊 **Data Relationships**

### **Formulation Ingredients Relationships:**

#### **FML001 - MIXING - ICY MINT (SKU001)**
1. **SALTNIC A6H1007**: 11,880.000g (±0.100g)
2. **PROPYLENE GLYCOL (PG)**: 5,445.000g (±0.500g)
3. **VEGETABLE GLYCERIN (VG)**: 39,600.000g (±0.500g)
4. **MINT FLAVOR**: 2,075.000g (±0.100g)

#### **FML002 - MIXING - FOOM X A (SKU002)**
1. **SALTNIC A6H1007**: 90.000g (±0.100g)
2. **PROPYLENE GLYCOL (PG)**: 702.000g (±0.500g)
3. **VEGETABLE GLYCERIN (VG)**: 16,200.000g (±0.500g)

#### **FML003 - MIXING - VANILLA CREAM (SKU003)**
1. **PROPYLENE GLYCOL (PG)**: 15,000.000g (±0.500g)
2. **VEGETABLE GLYCERIN (VG)**: 25,000.000g (±0.500g)
3. **CREAM BASE**: 10,000.000g (±1.000g)

## 🎯 **Benefits of New Structure**

### **1. Clear Separation of Concerns**
- **Products**: Finished goods/SKU for production
- **Ingredients**: Raw materials for formulations
- **Formulations**: Recipes linking SKU to ingredients

### **2. Better Data Organization**
- **Master Products**: Focus on production output
- **Master Ingredients**: Focus on raw materials
- **Master Formulations**: Focus on recipes and relationships

### **3. Improved Production Workflow**
- **Production Planning**: Use SKU from master products
- **Recipe Management**: Use formulations with ingredient details
- **Inventory Management**: Track ingredients separately

### **4. Enhanced Data Integrity**
- **Foreign Key Constraints**: Proper relationships
- **Data Validation**: Check constraints for categories
- **Unique Constraints**: Prevent duplicates

## 🔍 **Database Schema Changes**

### **New Tables Created**
1. **master_ingredients**: Raw materials/ingredients
2. **formulation_ingredients**: Many-to-many relationship

### **Existing Tables Modified**
1. **master_product**: Now contains SKU/finished products
2. **master_formulation**: Now links to SKU and ingredients

### **Indexes Added**
```sql
CREATE INDEX idx_master_ingredients_code ON master_ingredients(ingredient_code);
CREATE INDEX idx_master_ingredients_category ON master_ingredients(category);
CREATE INDEX idx_formulation_ingredients_formulation ON formulation_ingredients(formulation_id);
CREATE INDEX idx_formulation_ingredients_ingredient ON formulation_ingredients(ingredient_id);
CREATE INDEX idx_formulation_ingredients_sequence ON formulation_ingredients(sequence_order);
```

## 📈 **Data Summary**

### **Current Data Count**
- **Master Products (SKU)**: 3
- **Master Ingredients**: 5
- **Master Formulations**: 3
- **Formulation Ingredients**: 10

### **Data Categories**
- **Product Categories**: sfg (Semi-Finished Goods)
- **Ingredient Categories**: additive, base, flavor
- **Tolerance Types**: high, standard, low

## 🚀 **Production Workflow**

### **1. Production Planning**
1. Select SKU from **Master Products**
2. View formulation details from **Master Formulations**
3. Check ingredient requirements from **Formulation Ingredients**

### **2. Recipe Management**
1. **Master Formulations**: Define SKU recipes
2. **Formulation Ingredients**: Specify ingredient quantities
3. **Master Ingredients**: Manage raw material inventory

### **3. Quality Control**
1. **Tolerance Groups**: Define precision requirements
2. **Ingredient Tolerances**: Set weight tolerances
3. **Sequence Order**: Define mixing order

## 🔧 **Technical Implementation**

### **Database Queries**
```sql
-- Get SKU with ingredients
SELECT 
    p.product_code,
    p.product_name,
    f.formulation_name,
    i.ingredient_name,
    fi.target_weight,
    fi.tolerance_min,
    fi.tolerance_max
FROM master_product p
JOIN master_formulation f ON p.product_code = f.sku
JOIN formulation_ingredients fi ON f.id = fi.formulation_id
JOIN master_ingredients i ON fi.ingredient_id = i.id
WHERE p.product_code = 'SKU001'
ORDER BY fi.sequence_order;
```

### **Data Validation**
- **Product Categories**: Only 'raw' or 'sfg'
- **Ingredient Categories**: 'flavor', 'base', 'additive', 'other'
- **Tolerance Types**: 'high', 'standard', 'low'
- **Status Values**: 'active', 'inactive'

## 📝 **Migration Notes**

### **Data Migration Process**
1. **Backup**: Original data backed up
2. **Clear**: Existing master_product and master_formulation data
3. **Create**: New master_ingredients table
4. **Insert**: New product data (SKU)
5. **Insert**: New ingredient data
6. **Insert**: New formulation data
7. **Link**: Formulation-ingredient relationships

### **Data Integrity**
- **Foreign Keys**: Properly configured
- **Constraints**: Data validation enforced
- **Indexes**: Performance optimized
- **Relationships**: Many-to-many properly implemented

## 🎯 **Next Steps**

### **UI Updates Required**
1. **Master Product UI**: Update to show SKU/finished products
2. **Master Formulation UI**: Update to show ingredient relationships
3. **New Master Ingredients UI**: Create interface for raw materials
4. **Production UI**: Update to use new structure

### **API Updates Required**
1. **Product API**: Update to handle SKU data
2. **Formulation API**: Update to handle ingredient relationships
3. **Ingredient API**: Create new API for raw materials
4. **Production API**: Update to use new structure

---

**Last Updated**: [Current Date]
**Version**: 2.0.0
**Database**: FLB_MOWS
**Status**: ✅ Successfully Updated


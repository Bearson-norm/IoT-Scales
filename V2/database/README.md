# FLB_MOWS Database Documentation

## Database Configuration

- **Database Name**: FLB_MOWS
- **Username**: postgres
- **Password**: Admin123
- **Host**: localhost
- **Port**: 5432

## Setup Instructions

### 1. Install PostgreSQL
Make sure PostgreSQL is installed on your system.

### 2. Create Database
```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database
CREATE DATABASE FLB_MOWS;

-- Connect to the new database
\c FLB_MOWS;
```

### 3. Run Schema
```bash
# Run the schema file
psql -U postgres -d FLB_MOWS -f schema.sql
```

## Database Schema

### Master Tables

#### 1. master_tolerance_grouping
Stores tolerance grouping configurations for weighing operations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| code | VARCHAR(50) | Unique tolerance code |
| name | VARCHAR(255) | Tolerance name |
| description | TEXT | Description |
| min_tolerance | DECIMAL(10,3) | Minimum tolerance value |
| max_tolerance | DECIMAL(10,3) | Maximum tolerance value |
| unit | VARCHAR(10) | Unit of measurement |
| status | VARCHAR(20) | active/inactive |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

#### 2. master_product
Stores product master data.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| product_code | VARCHAR(50) | Unique product code |
| product_name | VARCHAR(255) | Product name |
| product_category | VARCHAR(20) | raw/sfg |
| type_tolerance | VARCHAR(20) | high/standard/low |
| tolerance_grouping_id | UUID | FK to master_tolerance_grouping |
| status | VARCHAR(20) | active/inactive |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

#### 3. master_formulation
Stores formulation master data.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| formulation_code | VARCHAR(50) | Unique formulation code |
| formulation_name | VARCHAR(255) | Formulation name |
| sku | VARCHAR(50) | SKU reference |
| total_mass | DECIMAL(12,3) | Total mass in grams |
| total_ingredients | INTEGER | Number of ingredients |
| status | VARCHAR(20) | active/inactive |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

#### 4. master_formulation_ingredients
Junction table for formulation ingredients.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| formulation_id | UUID | FK to master_formulation |
| product_id | UUID | FK to master_product |
| target_mass | DECIMAL(12,3) | Target mass for ingredient |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

#### 5. master_user
Stores user master data.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| username | VARCHAR(50) | Unique username |
| name | VARCHAR(255) | Full name |
| email | VARCHAR(255) | Email address |
| password_hash | VARCHAR(255) | Hashed password |
| role | VARCHAR(20) | admin/supervisor/operator |
| status | VARCHAR(20) | active/inactive |
| last_login | TIMESTAMP | Last login time |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### Operational Tables

#### 1. work_orders
Stores work order information.

#### 2. weighing_sessions
Stores individual weighing session data.

#### 3. barcode_scans
Stores barcode scan history.

## Import/Export Features

### Supported Formats
- **JSON**: Human-readable format for data exchange
- **CSV**: Spreadsheet-compatible format

### Export Functions
- `exportMasterProduct()`: Export product data
- `exportMasterFormulation()`: Export formulation data
- `exportMasterToleranceGrouping()`: Export tolerance grouping data
- `exportMasterUser()`: Export user data
- `exportAllMasterData()`: Export all master data

### Import Functions
- `importMasterProduct()`: Import product data with validation
- `importMasterFormulation()`: Import formulation data with validation
- `importMasterToleranceGrouping()`: Import tolerance grouping data with validation
- `importMasterUser()`: Import user data with validation

### Data Validation
Each import function includes validation for:
- Required fields
- Data type validation
- Business rule validation
- Format validation

## Sample Data

The schema includes sample data for testing:
- 3 tolerance groupings
- 5 products
- 3 formulations with ingredients
- 4 users

## API Endpoints (Future)

Planned API endpoints for database operations:
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- Similar endpoints for other master tables

## Backup and Restore

### Backup
```bash
pg_dump -U postgres -d FLB_MOWS > backup.sql
```

### Restore
```bash
psql -U postgres -d FLB_MOWS < backup.sql
```

## Security Considerations

1. **Password Hashing**: User passwords are hashed using bcrypt
2. **Input Validation**: All inputs are validated before database operations
3. **SQL Injection**: Use parameterized queries
4. **Access Control**: Implement role-based access control
5. **Audit Trail**: Track all data modifications

## Performance Optimization

1. **Indexes**: Created on frequently queried columns
2. **Connection Pooling**: Configured for optimal performance
3. **Query Optimization**: Use EXPLAIN ANALYZE for slow queries
4. **Partitioning**: Consider partitioning for large tables

## Monitoring

1. **Database Metrics**: Monitor connection count, query performance
2. **Error Logging**: Log all database errors
3. **Backup Monitoring**: Ensure regular backups are successful
4. **Disk Space**: Monitor database size and disk usage



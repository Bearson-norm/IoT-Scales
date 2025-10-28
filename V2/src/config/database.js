// Database configuration for PostgreSQL
const config = {
  development: {
    host: 'localhost',
    port: 5432,
    database: 'FLB_MOWS',
    username: 'postgres',
    password: 'Admin123',
    dialect: 'postgres',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'FLB_MOWS',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Admin123',
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    }
  }
};

module.exports = config;



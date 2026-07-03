const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbType = process.env.DB_TYPE || 'sqlite';
let mysqlPool;
let sqliteConnection;

/**
 * Initializes the connection pool/file based on DB_TYPE ('mysql' or 'sqlite')
 */
async function initDB() {
  if (dbType === 'mysql') {
    const mysql = require('mysql2/promise');
    console.log('Using MySQL database engine.');

    const poolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'github_analyzer',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };

    // Enable SSL if running in production/Vercel (Aiven, Clever Cloud, etc., require SSL)
    if (process.env.DB_SSL === 'true') {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    // Try to auto-create database if possible (usually works locally, might skip on cloud platforms with restricted user privileges)
    try {
      const initConfig = { ...poolConfig };
      delete initConfig.database;
      const tempConn = await mysql.createConnection(initConfig);
      await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${poolConfig.database}\`;`);
      await tempConn.end();
    } catch (err) {
      console.log('Skipped DB auto-creation (limited cloud DB permissions):', err.message);
    }

    // Initialize MySQL Connection Pool
    mysqlPool = mysql.createPool(poolConfig);

    // Initialize schema if not exist
    try {
      const [rows] = await mysqlPool.query("SHOW TABLES LIKE 'profiles'");
      if (rows.length === 0) {
        console.log('Initializing MySQL database schema...');
        const schemaPath = path.join(__dirname, '../database/schema_mysql.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await mysqlPool.query(schemaSql);
        console.log('MySQL database schema initialized successfully.');
      }
    } catch (error) {
      console.error('Error initializing MySQL database schema:', error.message);
    }

  } else {
    // SQLite
    const sqlite3 = require('sqlite3').verbose();
    console.log('Using SQLite database engine.');

    const dbPath = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');
    return new Promise((resolve, reject) => {
      sqliteConnection = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening SQLite database:', err.message);
          return reject(err);
        }
        console.log(`Connected to SQLite database at: ${dbPath}`);
        
        initializeSQLiteSchema()
          .then(resolve)
          .catch(reject);
      });
    });
  }
}

/**
 * Helper to build SQLite tables if not present
 */
async function initializeSQLiteSchema() {
  return new Promise((resolve, reject) => {
    sqliteConnection.get("SELECT name FROM sqlite_master WHERE type='table' AND name='profiles'", (err, row) => {
      if (err) return reject(err);
      
      if (!row) {
        console.log('Initializing SQLite database schema...');
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        sqliteConnection.exec(schemaSql, (execErr) => {
          if (execErr) return reject(execErr);
          console.log('SQLite database schema initialized successfully.');
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

/**
 * Universal Promise-based query helper for both MySQL and SQLite SELECT/modifications.
 */
async function query(sql, params = []) {
  if (dbType === 'mysql') {
    return mysqlPool.query(sql, params);
  } else {
    return new Promise((resolve, reject) => {
      const trimmedSql = sql.trim().toUpperCase();
      if (trimmedSql.startsWith('SELECT')) {
        sqliteConnection.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve([rows]);
        });
      } else {
        sqliteConnection.run(sql, params, function (err) {
          if (err) return reject(err);
          resolve([{ lastInsertId: this.lastID, affectedRows: this.changes }]);
        });
      }
    });
  }
}

/**
 * Helper to close connection
 */
async function closeDB() {
  if (dbType === 'mysql') {
    if (mysqlPool) {
      await mysqlPool.end();
      mysqlPool = null;
    }
  } else {
    if (sqliteConnection) {
      return new Promise((resolve, reject) => {
        sqliteConnection.close((err) => {
          if (err) return reject(err);
          sqliteConnection = null;
          resolve();
        });
      });
    }
  }
}

module.exports = {
  initDB,
  query,
  closeDB
};

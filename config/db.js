const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');
let dbConnection;

/**
 * Initializes the SQLite database connection and runs initial schema migrations if necessary
 */
async function initDB() {
  return new Promise((resolve, reject) => {
    dbConnection = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening SQLite database:', err.message);
        return reject(err);
      }
      console.log(`Connected to SQLite database at: ${dbPath}`);
      
      initializeSchema()
        .then(resolve)
        .catch(reject);
    });
  });
}

/**
 * Executes schema.sql script to build tables if the profiles table doesn't exist
 */
async function initializeSchema() {
  return new Promise((resolve, reject) => {
    dbConnection.get("SELECT name FROM sqlite_master WHERE type='table' AND name='profiles'", (err, row) => {
      if (err) {
        return reject(err);
      }
      
      if (!row) {
        console.log('Initializing SQLite database schema...');
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        dbConnection.exec(schemaSql, (execErr) => {
          if (execErr) {
            console.error('Error executing schema SQL:', execErr);
            return reject(execErr);
          }
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
 * Promise-based query helper for SQLite SELECT and modifications.
 * Returns an array [result] to keep controller changes minimal.
 */
async function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    const trimmedSql = sql.trim().toUpperCase();
    if (trimmedSql.startsWith('SELECT')) {
      dbConnection.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve([rows]);
      });
    } else {
      dbConnection.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve([{ lastInsertId: this.lastID, affectedRows: this.changes }]);
      });
    }
  });
}

/**
 * Closes the SQLite connection
 */
async function closeDB() {
  if (dbConnection) {
    return new Promise((resolve, reject) => {
      dbConnection.close((err) => {
        if (err) return reject(err);
        dbConnection = null;
        resolve();
      });
    });
  }
}

module.exports = {
  initDB,
  query,
  closeDB
};

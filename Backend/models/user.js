const db = require("../config/db");

let tableReady;

async function ensureUserTable() {
  if (!tableReady) {
    tableReady = db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100) UNIQUE,
        password VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `).catch((error) => {
      tableReady = null;
      throw error;
    });
  }

  return tableReady;
}

module.exports = ensureUserTable;

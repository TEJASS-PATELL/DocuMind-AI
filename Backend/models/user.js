const db = require("../config/db");

async function ConnectUser() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100) UNIQUE,
        password VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Users table created successfully.");
  } catch (err) {
    console.error("Error creating users table:", err);
  }
}

ConnectUser();

module.exports = ConnectUser;

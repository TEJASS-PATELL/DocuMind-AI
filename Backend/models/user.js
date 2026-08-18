const db = require("../config/db");

async function ConnectUser() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS aiusers (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("aiusers table is ready.");
  } catch (err) {
    console.error("Failed to create aiusers table:", err.message);
    throw err;
  }
}

ConnectUser().catch(() => {
  process.exit(1);
});

module.exports = ConnectUser;
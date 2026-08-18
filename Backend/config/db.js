const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  ssl: {
    rejectUnauthorized: false
  }
});

const testConnection = async () => {
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.ping();
    console.log("MySQL Connection Established successfully!");
  } catch (error) {
    console.error("MySQL Connection Error:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

testConnection();

module.exports = pool;
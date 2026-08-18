const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false 
  }
});

pool.getConnection()
  .then((connection) => {
    console.log("MySQL Connection Established successfully!");
    connection.release();
  })
  .catch((err) => {
    console.error("MySQL Connection Error:", err);
    process.exit(1);
  });

module.exports = pool;
const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  uri: DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.getConnection()
  .then((connection) => {
    console.log("MySQL Connection Established successfully on Railway!");
    connection.release();
  })
  .catch((err) => {
    console.error("MySQL Connection Error on Railway:", err);
    process.exit(1);
  });

module.exports = pool;
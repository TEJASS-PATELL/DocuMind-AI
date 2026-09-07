const mysql = require("mysql2/promise");
require("dotenv").config();

const databaseUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("MYSQL_URL or DATABASE_URL must be configured");
}

let databaseConfig;

try {
  const parsedUrl = new URL(databaseUrl);
  databaseConfig = {
    host: parsedUrl.hostname,
    port: parsedUrl.port ? Number(parsedUrl.port) : 3306,
    user: decodeURIComponent(parsedUrl.username),
    password: decodeURIComponent(parsedUrl.password),
    database: parsedUrl.pathname.slice(1),
  };
} catch (error) {
  throw new Error(`Invalid MySQL connection URL: ${error.message}`);
}

const pool = mysql.createPool({
  ...databaseConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;
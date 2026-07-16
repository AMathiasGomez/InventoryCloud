// Conexión a MySQL mediante un pool de conexiones (mysql2/promise).
const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

if (process.env.MYSQL_URL) {
  // Railway ofrece una URL completa: mysql://user:pass@host:port/db
  pool = mysql.createPool(process.env.MYSQL_URL);
} else {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'inventorycloud',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
  });
}

module.exports = pool;

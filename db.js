const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool();

pool.on('connect', () => {
  console.log('Terhubung ke database PostgreSQL!');
});

module.exports = pool;
const bcrypt = require('bcrypt');
const pool = require('../db');
const TokenManager = require('../utils/tokenManager');

const authenticateUser = async ({ email, password }) => {
  // cek user di DB
  const result = await pool.query('SELECT user_id, full_name, password FROM users WHERE email = $1', [email]);

  if (result.rows.length === 0) {
    const err = new Error('Account not found');
    err.statusCode = 401;

    throw err;
  }

  const user = result.rows[0];

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    const err = new Error('Incorrect Email and Password');
    err.statusCode = 401;

    throw err;
  }

  // Generate Token pasangan baru
  const payload = { id: user.user_id };
  const accessToken = TokenManager.generateAccessToken(payload);
  const refreshToken = TokenManager.generateRefreshToken(payload);

  // Simpan refresh token ke database
  await pool.query('INSERT INTO authentications VALUES($1)', [refreshToken]);

  return { 
    accessToken, 
    refreshToken
   };
};

const refreshSession = async (refreshToken) => {

  // 1. Cek token di DB
  const checkToken = await pool.query('SELECT token FROM authentications WHERE token = $1', [refreshToken]);

  if (checkToken.rows.length === 0) {
    const err = new Error('Refresh token invalid in database');
    err.statusCode = 400;

    throw err;
  }

  // Verifikasi token secara matematis JWT
  const { id } = TokenManager.verifyRefreshToken(refreshToken);

  // Keluarkan Access Token baru yang segar
  const accessToken = TokenManager.generateAccessToken({ id });
  return accessToken;
};

const revokeToken = async (refreshToken) => {

  // Cek token sebelum dihapus
  const checkToken = await pool.query('SELECT token FROM authentications WHERE token = $1', [refreshToken]);

  if (checkToken.rows.length === 0) {
    const err = new Error('Refresh token invalid in database');
    err.statusCode = 400;

    throw err;
  }

  // 2. Hapus sesi token dari DB (User logout)
  await pool.query('DELETE FROM authentications WHERE token = $1', [refreshToken]);
};

module.exports = { authenticateUser, refreshSession, revokeToken };
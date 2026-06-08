const bcrypt = require('bcrypt');
const pool = require('../db');
const TokenManager = require('../utils/tokenManager');

const authenticateUser = async ({ email, password }) => {
  // 1. Cari user di DB
  const result = await pool.query('SELECT user_id, full_name, password FROM users WHERE email = $1', [email]);

  if (result.rows.length === 0) {
    const err = new Error('Akun tidak ditemukan');
    err.statusCode = 401;

    throw err;
  }

  const user = result.rows[0];

  // 2. Cocokkan password
  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    const err = new Error('Kata sandi dan email salah');
    err.statusCode = 401;

    throw err;
  }

  // 3. Generate Token pasangan baru
  const payload = { id: user.user_id };
  const accessToken = TokenManager.generateAccessToken(payload);
  const refreshToken = TokenManager.generateRefreshToken(payload);

  // 4. Simpan refresh token ke database
  await pool.query('INSERT INTO authentications VALUES($1)', [refreshToken]);

  return { 
    accessToken, 
    refreshToken
   };
};

const refreshSession = async (refreshToken) => {
  // 1. Cek keberadaan token di DB
  const checkToken = await pool.query('SELECT token FROM authentications WHERE token = $1', [refreshToken]);

  if (checkToken.rows.length === 0) {
    const err = new Error('Refresh token tidak valid di database');
    err.statusCode = 400;

    throw err;
  }

  // 2. Verifikasi token secara matematis JWT
  const { id } = TokenManager.verifyRefreshToken(refreshToken);

  // 3. Keluarkan Access Token baru yang segar
  const accessToken = TokenManager.generateAccessToken({ id });
  return accessToken;
};

const revokeToken = async (refreshToken) => {
  // 1. Cek eksistensi token sebelum dihapus
  const checkToken = await pool.query('SELECT token FROM authentications WHERE token = $1', [refreshToken]);

  if (checkToken.rows.length === 0) {
    const err = new Error('Refresh token tidak ditemukan di database');
    err.statusCode = 400;

    throw err;
  }

  // 2. Hapus sesi token dari DB (User logout)
  await pool.query('DELETE FROM authentications WHERE token = $1', [refreshToken]);
};

module.exports = { authenticateUser, refreshSession, revokeToken };
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const pool = require("../db");

const register = async (userData) => {
  const { full_name, email, password } = userData;
  const user_id = `user-${crypto.randomUUID()}`;
  const hashedPassword = await bcrypt.hash(password, 10);
  const createdAt = new Date().toISOString();

  try {
    await pool.query(
      "INSERT INTO users VALUES($1, $2, $3, $4, $5) RETURNING user_id",
      [user_id, email, hashedPassword, full_name, createdAt],
    );

    return { user_id };

  } catch (dbError) {
    if (dbError.code === "23505") {
      const err = new Error("Email sudah digunakan");
      err.statusCode = 400;

      throw err;
    }

    throw dbError;
  }
};

const getById = async (id) => {
  const result = await pool.query(
    `SELECT u.user_id, u.full_name, ua.theta_score, u.email, u.created_at 
    FROM users u
    JOIN user_abilities ua ON ua.user_id = u.user_id
    WHERE u.user_id = $1`,
    [id],
  );

  if (result.rows.length === 0) {
    const err = new Error("User tidak ditemukan");
    err.statusCode = 404;
    throw err;
  }

  return { userData: result.rows[0], source: "database" };
};

module.exports = { register, getById };

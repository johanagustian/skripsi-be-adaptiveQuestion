const jwt = require('jsonwebtoken');

const TokenManager = {
  generateAccessToken: (payload) => {
    return jwt.sign(payload, process.env.ACCESS_TOKEN_KEY, { expiresIn: '3h' });
  },

  generateRefreshToken: (payload) => {
    return jwt.sign(payload, process.env.REFRESH_TOKEN_KEY);
  },

  verifyRefreshToken: (refreshToken) => {
    try {
      const artifacts = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_KEY);

      return artifacts;
    } catch (error) {
      const err = new Error('Refresh token tidak valid');
      err.statusCode = 400;
      
      throw err;
    }
  },
};

module.exports = TokenManager;
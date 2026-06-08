const authService = require('../services/authService');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    const tokens = await authService.authenticateUser({ email, password });

    return res.status(200).json({
      status: 'success',
      message: 'Authentication berhasil ditambahkan',
      data: tokens,
    });
  } catch (error) {
    next(error);
  }
};

const renewAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    const accessToken = await authService.refreshSession(refreshToken);

    return res.status(200).json({
      status: 'success',
      message: 'Access Token berhasil diperbarui',
      data: { accessToken },
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    await authService.revokeToken(refreshToken);

    return res.status(200).json({
      status: 'success',
      message: 'Refresh token berhasil dihapus',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, renewAccessToken, logout };
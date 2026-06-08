const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { LOGIN_SCHEMA, REFRESH_TOKEN_SCHEMA } = require('../utils/validations')

const validateLogin = (req, res, next) => {
    const { error, value } = LOGIN_SCHEMA.validate(req.body);

    if (error) {
        return res.status(401).json({
            status: 'failed',
            message: 'Email dan password tidak sesuai'
        })
    }

    const { email, password } = value;
    next()
};

const validateRefreshToken = (req, res, next) => {
    const { error, value } = REFRESH_TOKEN_SCHEMA.validate(req.body);

    if (error) {
        return res.status(401).json({ 
            status: 'failed', 
            message: 'Refresh token tidak sesuai' 
        });
    }

    const { refreshToken } = value;
    next()
};

router.post('/', validateLogin, authController.login);
router.put('/', validateRefreshToken, authController.renewAccessToken);
router.delete('/', validateRefreshToken, authController.logout);

module.exports = router;
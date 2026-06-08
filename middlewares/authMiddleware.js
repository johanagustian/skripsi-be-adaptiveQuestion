const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        const err = new Error('Akses ditolak. Token tidak ditemukan.');
        err.statusCode = 401;
        return next(err);
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_KEY);

        req.user = decoded;
        next();
    } catch (error) {
        const err = new Error('Token tidak valid atau sudah kadaluarsa');
        err.statusCode = 401;
        next(err);
    }
}

module.exports = authenticateToken;

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticationToken = require('../middlewares/authMiddleware')


router.post('/', userController.registerUser);
router.get('/me', authenticationToken, userController.getCurrentUser)
router.get('/:id', userController.getUserById);

module.exports = router;
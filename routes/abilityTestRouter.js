const express = require('express');
const router = express.Router();
const abilityTestController = require('../controllers/abilityTestController');
const authenticateToken = require('../middlewares/authMiddleware');

router.get('/check-status', authenticateToken, abilityTestController.getUserStatus)
router.post('/start', authenticateToken, abilityTestController.generateAbilityTest);
router.post('/submit', authenticateToken, abilityTestController.submitAbilityTest);

module.exports = router;
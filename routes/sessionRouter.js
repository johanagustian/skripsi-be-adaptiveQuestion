const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const authenticateToken = require('../middlewares/authMiddleware'); // Pastikan path middleware auth kamu benar

// Semua rute ini wajib login (dilindungi token JWT)
router.get('/', authenticateToken, sessionController.getAllSessions); // Endpoint: GET /sessions/
router.get('/:session_id/review', authenticateToken, sessionController.getSessionReview); // Endpoint: GET /sessions/:session_id/review
router.post('/start', authenticateToken, sessionController.startSession);
router.post('/next-question', authenticateToken, sessionController.getNextQuestion);
router.post('/submit-answer', authenticateToken, sessionController.submitAnswer);
router.get('/:session_id/summary', authenticateToken, sessionController.getSessionSummary);
 
module.exports = router;
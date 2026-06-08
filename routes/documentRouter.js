const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authenticateToken = require('../middlewares/authMiddleware');
const { uploadSinglePdf } = require('../middlewares/uploadMiddleware');

router.get('/', authenticateToken, documentController.getAllDocuments);

router.get('/:document_id', authenticateToken, documentController.getDocumentById);

router.post('/', authenticateToken, uploadSinglePdf('file'), documentController.uploadDoc);

router.delete('/:document_id', authenticateToken, documentController.deleteDoc);

module.exports = router;
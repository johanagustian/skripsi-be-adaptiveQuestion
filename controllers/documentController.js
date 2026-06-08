const documentService = require('../services/documentService');

const uploadDoc = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ status: 'fail', message: 'File dokumen tidak ditemukan' });
        }

        // Menggunakan file.originalname sebagai nama dokumen otomatis di database
        const newDoc = await documentService.saveDocument(user_id, file.originalname, file.path);

        return res.status(201).json({
            status: 'success',
            message: 'Berhasil upload dokumen',
            data: {
                document_id: newDoc.document_id,
                file_name: file.originalname,
                storage_name: file.filename,
                size: file.size
            }
        });
    } catch (error) {
        next(error);
    }
};

const getAllDocuments = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const documents = await documentService.getDocumentsByUser(user_id);

        return res.status(200).json({
            status: 'success',
            data: { documents }
        });
    } catch (error) {
        next(error);
    }
};

const getDocumentById = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const { document_id } = req.params;

        const document = await documentService.getDocumentById(document_id, user_id);

        return res.status(200).json({
            status: 'success',
            data: document
        });
    } catch (error) {
        next(error);
    }
};

const deleteDoc = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const { document_id } = req.params;

        await documentService.deleteDocument(document_id, user_id);

        return res.status(200).json({
            status: 'success',
            message: 'Berhasil menghapus dokumen'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { uploadDoc, getAllDocuments, getDocumentById, deleteDoc };
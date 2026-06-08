const multer = require('multer');

// Konfigurasi lokasi dan penamaan file fisik
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Filter khusus untuk memastikan hanya file PDF yang lolos
const fileFilter = function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Hanya diperbolehkan mengunggah berkas format PDF!'), false);
    }
};

// Inisialisasi multer dengan batasan ukuran 15 MB
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 15 * 1024 * 1024, // 15 MB dalam bytes
    },
    fileFilter: fileFilter
});

// Middleware wrapper untuk menangani error limit atau filter secara rapi
const uploadSinglePdf = (fieldName) => {
    return (req, res, next) => {
        upload.single(fieldName)(req, res, function (err) {
            if (err) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ 
                        status: 'fail', 
                        message: 'Ukuran file terlalu besar. Maksimal ukuran file adalah 15 MB.' 
                    });
                }
                return res.status(400).json({ status: 'fail', message: err.message });
            }
            // Jika tidak ada error dari Multer, lanjut ke controller
            next();
        });
    };
};

module.exports = { uploadSinglePdf };
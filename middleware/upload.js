const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

/**
 * Returns a multer middleware configured to accept only specific file extensions.
 * @param {string[]} allowedExtensions - e.g. ['.jpg', '.png', '.pdf']
 */
const createUploadMiddleware = (allowedExtensions) => {
    return multer({
        storage,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
        fileFilter: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            if (allowedExtensions.includes(ext)) {
                cb(null, true);
            } else {
                cb(new Error(`Only ${allowedExtensions.join(', ')} files are allowed!`));
            }
        }
    });
};

module.exports = createUploadMiddleware;

const multer = require('multer');

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Buffers land in memory (not disk) so we can stream them straight to
// Cloudinary without ever writing a temp file to the server's filesystem.
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    const error = new Error('Only JPEG, PNG, or WEBP images are allowed');
    error.statusCode = 400;
    return cb(error);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

module.exports = upload;

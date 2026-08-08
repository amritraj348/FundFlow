const { PassThrough } = require('stream');
const cloudinary = require('../config/cloudinary');

// Streams an in-memory file buffer (from multer) up to Cloudinary without
// touching disk. Resolves with the upload result (we mainly care about
// secure_url + public_id).
function uploadBufferToCloudinary(buffer, { folder }) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({ folder, resource_type: 'image' }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });

    const bufferStream = new PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
  });
}

module.exports = uploadBufferToCloudinary;

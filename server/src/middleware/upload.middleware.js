const multer = require('multer');
const multerS3 = require('multer-s3');
const { v4: uuidv4 } = require('uuid');
const { s3Client, S3_BUCKET_NAME } = require('../config/s3');
const ApiError = require('../utils/ApiError');

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function makeUploader({ prefix, allowedMimeTypes, maxSizeMB }) {
  return multer({
    storage: multerS3({
      s3: s3Client,
      bucket: S3_BUCKET_NAME,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) => {
        const key = `${prefix}/${req.user.id}/${uuidv4()}-${sanitizeFilename(file.originalname)}`;
        cb(null, key);
      },
    }),
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
      }
      cb(null, true);
    },
  });
}

const uploadProfilePicture = makeUploader({
  prefix: 'profile-pictures',
  allowedMimeTypes: IMAGE_MIME_TYPES,
  maxSizeMB: 3,
});

const uploadResume = makeUploader({
  prefix: 'resumes',
  allowedMimeTypes: DOCUMENT_MIME_TYPES,
  maxSizeMB: 5,
});

const uploadPostAttachment = makeUploader({
  prefix: 'posts',
  allowedMimeTypes: [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES],
  maxSizeMB: 5,
});

module.exports = {
  uploadProfilePicture,
  uploadResume,
  uploadPostAttachment,
  IMAGE_MIME_TYPES,
  DOCUMENT_MIME_TYPES,
};

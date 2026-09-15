const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, S3_BUCKET_NAME } = require('../config/s3');

// Public URL for an object, assuming the bucket serves these keys as public-read
// (see README for the bucket policy). Switch this to a presigned GET URL later
// if the bucket should stay fully private.
function buildPublicUrl(key) {
  return `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

async function deleteS3Object(key) {
  if (!key) return;
  await s3Client.send(
    new DeleteObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key })
  );
}

module.exports = { buildPublicUrl, deleteS3Object };

const { S3Client } = require('@aws-sdk/client-s3');

// If AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are not set (e.g. on EC2 with an
// attached IAM role), the SDK's default credential provider chain takes over.
const hasExplicitCreds = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  ...(hasExplicitCreds && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  }),
});

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

module.exports = { s3Client, S3_BUCKET_NAME };

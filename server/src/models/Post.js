const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: [2000, 'Post text must be at most 2000 characters'],
      default: '',
    },
    attachment: {
      key: { type: String },
      url: { type: String },
      mimeType: { type: String },
      originalName: { type: String },
      type: {
        // coarse kind, used by the UI to decide how to render the attachment
        type: String,
        enum: ['image', 'document', null],
        default: null,
      },
    },
  },
  { timestamps: true }
);

// A post must have text, an attachment, or both - never neither.
postSchema.pre('validate', function requireContent(next) {
  const hasText = this.text && this.text.trim().length > 0;
  const hasAttachment = !!(this.attachment && this.attachment.key);
  if (!hasText && !hasAttachment) {
    this.invalidate('text', 'Post must have text or an attachment');
  }
  next();
});

postSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Post', postSchema);

const Message = require('../models/Message');
const asyncHandler = require('../utils/asyncHandler');

const getConversation = asyncHandler(async (req, res) => {
  const otherUserId = req.params.userId;
  const page = req.query.page || 1;
  const limit = req.query.limit || 30;

  const filter = {
    $or: [
      { from: req.user._id, to: otherUserId },
      { from: otherUserId, to: req.user._id },
    ],
  };

  const [messages, total] = await Promise.all([
    Message.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Message.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      messages: messages.reverse(),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

module.exports = { getConversation };

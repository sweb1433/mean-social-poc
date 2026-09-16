const express = require('express');
const requireAuth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { paginationValidator } = require('../validators/pagination.validator');
const { mongoIdParam } = require('../validators/user.validator');
const { getConversation } = require('../controllers/message.controller');

const router = express.Router();

router.use(requireAuth);

// Any logged-in user can fetch a conversation with any other user - chat is
// intentionally open between all users, not gated by role.
router.get('/:userId', mongoIdParam('userId'), paginationValidator, validate, getConversation);

module.exports = router;

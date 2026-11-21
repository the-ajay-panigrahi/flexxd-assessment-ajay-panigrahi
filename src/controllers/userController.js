const { sendError } = require('../utils/http');
const { HTTP_STATUS, ERROR_CODES } = require('../utils/constants');

function createUserController(store) {
  function getUser(req, res) {
    const user = store.users.find((item) => item.id === req.params.id);
    if (!user) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, 'User not found.');
    }

    const bookings = store.bookings.filter((booking) => booking.userId === user.id);
    return res.status(HTTP_STATUS.OK).json({ ...user, bookings });
  }

  return { getUser };
}

module.exports = { createUserController };

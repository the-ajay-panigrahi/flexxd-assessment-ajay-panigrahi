const crypto = require('node:crypto');
const { sendError } = require('../utils/http');
const { HTTP_STATUS, ERROR_CODES, REDEMPTION_TTL_MS } = require('../utils/constants');
const { isNonEmptyString } = require('../utils/validation');

function createBookingController(store) {
  function createBooking(req, res) {
    const { userId, venueId } = req.body || {};
    if (!isNonEmptyString(userId) || !isNonEmptyString(venueId)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT, 'userId and venueId must be non-empty strings.');
    }

    const user = store.users.find((item) => item.id === userId);
    if (!user) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, 'User not found.');
    }

    const venue = store.venues.find((item) => item.id === venueId);
    if (!venue) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, ERROR_CODES.VENUE_NOT_FOUND, 'Venue not found.');
    }

    if (user.visitCredits < 1) {
      return sendError(res, HTTP_STATUS.CONFLICT, ERROR_CODES.INSUFFICIENT_CREDITS, 'User has no visit credits remaining.');
    }

    const createdAt = new Date().toISOString();
    const bookingDate = createdAt.slice(0, 10);
    const usedCapacity = store.bookings.filter(
      (booking) => booking.venueId === venueId && booking.bookingDate === bookingDate,
    ).length;
    if (usedCapacity >= venue.dailyCapacity) {
      return sendError(res, HTTP_STATUS.CONFLICT, ERROR_CODES.CAPACITY_FULL, 'Venue daily capacity has been reached.');
    }

    let redemptionCode;
    do {
      redemptionCode = crypto.randomUUID();
    } while (store.bookings.some((booking) => booking.redemptionCode === redemptionCode));

    const booking = {
      id: crypto.randomUUID(),
      userId: user.id,
      venueId: venue.id,
      bookingDate,
      redemptionCode,
      redeemed: false,
      createdAt,
      redeemedAt: null,
    };

    user.visitCredits -= 1;
    store.bookings.push(booking);
    return res.status(HTTP_STATUS.CREATED).json(booking);
  }

  function redeemBooking(req, res) {
    const { redemptionCode } = req.body || {};
    if (!isNonEmptyString(redemptionCode)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT, 'redemptionCode must be a non-empty string.');
    }

    const booking = store.bookings.find((item) => item.redemptionCode === redemptionCode);
    if (!booking) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, ERROR_CODES.CODE_NOT_FOUND, 'Redemption code not found.');
    }
    if (booking.redeemed) {
      return sendError(res, HTTP_STATUS.CONFLICT, ERROR_CODES.ALREADY_REDEEMED, 'Booking has already been redeemed.');
    }

    const redeemedAt = new Date();
    if (redeemedAt.getTime() >= Date.parse(booking.createdAt) + REDEMPTION_TTL_MS) {
      return sendError(res, HTTP_STATUS.CONFLICT, ERROR_CODES.CODE_EXPIRED, 'Redemption code has expired.');
    }

    booking.redeemedAt = redeemedAt.toISOString();
    booking.redeemed = true;
    return res.status(HTTP_STATUS.OK).json(booking);
  }

  return { createBooking, redeemBooking };
}

module.exports = { createBookingController };

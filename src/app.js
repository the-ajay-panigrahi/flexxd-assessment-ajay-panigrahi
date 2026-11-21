const express = require('express');
const crypto = require('node:crypto');
const { createStore } = require('./store');

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function createApp(store = createStore()) {
  const app = express();
  app.use(express.json());

  app.post('/bookings', (req, res) => {
    const { userId, venueId } = req.body || {};
    if (!isNonEmptyString(userId) || !isNonEmptyString(venueId)) {
      return sendError(res, 400, 'INVALID_INPUT', 'userId and venueId must be non-empty strings.');
    }

    const user = store.users.find((item) => item.id === userId);
    if (!user) {
      return sendError(res, 404, 'USER_NOT_FOUND', 'User not found.');
    }

    const venue = store.venues.find((item) => item.id === venueId);
    if (!venue) {
      return sendError(res, 404, 'VENUE_NOT_FOUND', 'Venue not found.');
    }

    if (user.visitCredits < 1) {
      return sendError(res, 409, 'INSUFFICIENT_CREDITS', 'User has no visit credits remaining.');
    }

    const createdAt = new Date().toISOString();
    const bookingDate = createdAt.slice(0, 10);
    const usedCapacity = store.bookings.filter(
      (booking) => booking.venueId === venueId && booking.bookingDate === bookingDate,
    ).length;
    if (usedCapacity >= venue.dailyCapacity) {
      return sendError(res, 409, 'CAPACITY_FULL', 'Venue daily capacity has been reached.');
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
    return res.status(201).json(booking);
  });

  app.post('/bookings/redeem', (req, res) => {
    const { redemptionCode } = req.body || {};
    if (!isNonEmptyString(redemptionCode)) {
      return sendError(res, 400, 'INVALID_INPUT', 'redemptionCode must be a non-empty string.');
    }

    const booking = store.bookings.find((item) => item.redemptionCode === redemptionCode);
    if (!booking) {
      return sendError(res, 404, 'CODE_NOT_FOUND', 'Redemption code not found.');
    }
    if (booking.redeemed) {
      return sendError(res, 409, 'ALREADY_REDEEMED', 'Booking has already been redeemed.');
    }

    booking.redeemedAt = new Date().toISOString();
    booking.redeemed = true;
    return res.status(200).json(booking);
  });

  app.get('/users/:id', (req, res) => {
    const user = store.users.find((item) => item.id === req.params.id);
    if (!user) {
      return sendError(res, 404, 'USER_NOT_FOUND', 'User not found.');
    }

    const bookings = store.bookings.filter((booking) => booking.userId === user.id);
    return res.status(200).json({ ...user, bookings });
  });

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return sendError(res, 400, 'INVALID_INPUT', 'Request body must contain valid JSON.');
    }
    return next(err);
  });

  return app;
}

module.exports = { createApp };

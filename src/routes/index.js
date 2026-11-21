const { Router } = require('express');
const { createBookingController } = require('../controllers/bookingController');
const { createUserController } = require('../controllers/userController');

function createRoutes(store) {
  const router = Router();
  const { createBooking, redeemBooking } = createBookingController(store);
  const { getUser } = createUserController(store);

  router.post('/bookings', createBooking);
  router.post('/bookings/redeem', redeemBooking);
  router.get('/users/:id', getUser);

  return router;
}

module.exports = { createRoutes };

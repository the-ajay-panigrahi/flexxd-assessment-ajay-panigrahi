const express = require('express');
const { createStore } = require('./models/store');
const { createRoutes } = require('./routes');
const { sendError } = require('./utils/http');
const { HTTP_STATUS, ERROR_CODES } = require('./utils/constants');

function createApp(store = createStore()) {
  const app = express();
  app.use(express.json());
  app.use(createRoutes(store));

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_INPUT, 'Request body must contain valid JSON.');
    }
    return next(err);
  });

  return app;
}

module.exports = { createApp };

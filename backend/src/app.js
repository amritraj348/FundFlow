const express = require('express');
const cors = require('cors');

const config = require('./config/env');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');

const app = express();

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);

// Feature routes (ngos, campaigns, donations, ...) mount here as later
// phases add them.

app.use(notFound);
app.use(errorHandler);

module.exports = app;

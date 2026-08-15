const express = require('express');
const cors = require('cors');

const config = require('./config/env');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const ngoRouter = require('./routes/ngos');
const campaignRouter = require('./routes/campaigns');
const donationRouter = require('./routes/donations');

const app = express();

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/ngos', ngoRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api/donations', donationRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

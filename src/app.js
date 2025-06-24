const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('express-async-errors');

// const rateLimiter = require('./middleware/rateLimitter')
const serviceRoutes = require('./routes/services.routes');
const menuRoutes = require('./routes/menus.routes');
const reviewRouter = require('./routes/reviews.router')

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(compression());
app.use(express.json());

// app.use(rateLimiter);

// ⚡ Option 1: Apply cache to all GET routes under /api/v1
app.use('/services', serviceRoutes);
app.use('/menu', menuRoutes);
app.use('/reviews', reviewRouter)

// app.use('/api/v1', routes);
// app.use(errorHandler); // Custom error handling middleware

module.exports = app;
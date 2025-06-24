const express = require('express');
const router = express.Router();
const reviewsContoller = require('../controllers/reviews.controller')

router.patch('/', reviewsContoller.handleReviews);


module.exports = router;

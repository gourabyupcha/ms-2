const reviewService = require('../services/reviews.service');

exports.handleReviews = async (req, res) => {
  try {
    const result = await reviewService.patchReview(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
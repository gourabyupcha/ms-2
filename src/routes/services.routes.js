const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/services.controller');

router.get("/", servicesController.fetchService)
router.post('/', servicesController.createService);
// router.patch('/:id/accept', servicesController);

module.exports = router;

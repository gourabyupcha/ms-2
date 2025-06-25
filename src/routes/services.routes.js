const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/services.controller');

router.get("/", servicesController.fetchService)
router.post('/', servicesController.createService);

router.get("/allcategories", servicesController.fetchServicesCategory)
router.get("/latest", servicesController.fetchLatestService)
router.get("/popular", servicesController.fetchServiceByPopularity)
router.get("/:id", servicesController.fetchServiceById)

module.exports = router;

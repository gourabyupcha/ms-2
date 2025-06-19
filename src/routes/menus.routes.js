const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menus.controller');

router.get("/", menuController.fetchMenu)
router.post('/', menuController.createMenu);
// router.patch('/:id/accept', menuController.acceptBooking);

module.exports = router;

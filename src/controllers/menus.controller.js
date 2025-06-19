const menusService = require('../services/menus.service');

// Menu

exports.createMenu = async (req, res) => {
  try {
    const booking = await menusService.createMenu(req.body);
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.fetchMenu = async (req, res) => {
  try {
    const booking = await menusService.fetchMenu(req.params.id);
    res.status(200).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

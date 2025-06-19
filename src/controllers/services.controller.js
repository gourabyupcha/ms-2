const servicesService = require('../services/services.service');

exports.createService = async (req, res) => {
  try {
    const booking = await servicesService.createBooking(req.body);
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.fetchService = async (req, res) => {
  try {
    const booking = await servicesService.fetchService(req.query);
    res.status(200).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

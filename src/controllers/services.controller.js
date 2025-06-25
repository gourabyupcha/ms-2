const servicesService = require("../services/services.service");

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

exports.fetchLatestService = async (req, res) => {
  try {
    const result = await servicesService.fetchLatestService();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.fetchServiceById = async(req, res) => {
  try {
    const result = await servicesService.fetchServiceById(req.params.id)
    res.status(200).json(result)
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

exports.fetchServiceByPopularity = async(req, res) => {
  try {
    const result = await servicesService.fetchPopularService(req.body)
    res.status(200).json(result)
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

exports.fetchServicesCategory = async(req, res) => {
  try {
    const result = await servicesService.fetctServicesCatagories()
    res.status(200).json(result)
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
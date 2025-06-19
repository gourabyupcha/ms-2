const { getMenusCollection } = require("../config/db");
const { getChannel } = require("../utils/rabbitmq");

// bookingService.js


exports.createMenu = async (data) => {
  try {
    // Extract menu data from request body
    const { nanoid } = await import('nanoid');
    const menuId = `menu_${nanoid(10)}`

    const {
      serviceId,
      serviceType,
      name,
      description,
      price,
      currency,
      isCustom = false,
      items = [],
      customOptions = {}
    } = req.body;

    // Basic validation
    if (!serviceId || !serviceType || !name || !price) {
      return res.status(400).json({ message: 'Missing required fields' });
    }


    // Create a new menu object
    const menuPayload = {
      menuId: menuId,
      serviceId,
      serviceType,
      name,
      description,
      price,
      currency,
      isCustom,
      items,
      customOptions
    };

    // Save using service
    const savedMenu = await menusService.createMenu(menuPayload);

    // Respond with success
    res.status(201).json(savedMenu);

  } catch (err) {
    console.error('Error creating menu:', err);
    res.status(500).json({ message: err.message || 'Internal Server Error' });
  }
};

exports.fetchBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;

    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    const booking = await bookingsService.getBookingById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.status(200).json(booking);

  } catch (err) {
    console.error('Error fetching booking:', err);
    res.status(500).json({ message: err.message || 'Internal Server Error' });
  }
};

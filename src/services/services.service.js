const { getServicesCollection } = require("../config/db");
const { getChannel } = require("../utils/rabbitmq");
const crypto = require('crypto')
const redisClient = require('../config/redisClient')

exports.createService = async (serviceData) => {
    // Add timestamp
    const { nanoid } = await import('nanoid');
    const serviceId = `ss_${nanoid(10)}`

    serviceData.serviceId = serviceId
    serviceData.createdAt = new Date();

    // Validate required fields
    const requiredFields = ["title", "category", "price", "location", "sellerId"];
    const missing = requiredFields.filter(field => !serviceData[field]);
    if (missing.length) {
        throw { status: 400, message: `Missing fields: ${missing.join(', ')}` };
    }

    try {
        const collection = getServicesCollection();
        const result = await collection.insertOne(serviceData);
        return { message: "Service created", id: result.serviceId };
    } catch (err) {
        console.error("Error inserting service:", err);
        throw { status: 500, message: "Internal server error" };
    }
};


exports.fetchService = async (queryParams) => {
  const {
      q,
      category,
      location,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
      lat,
      lng,
      radius = 10000
  } = queryParams;

  try {
      // 🔐 Create cache key
      const cacheKey = crypto
          .createHash('md5')
          .update(JSON.stringify(queryParams))
          .digest('hex');

      // ⚡ Check Redis cache
      const cached = await redisClient.get(cacheKey);
      if (cached) {
          return JSON.parse(cached);
      }

      const services = getServicesCollection();

      let query = {};
      let projection = {};
      let sortOptions = {};

      // 📝 Text search
      if (q) {
          query.$text = { $search: q };
          projection = { score: { $meta: 'textScore' } };
          sortOptions = { score: { $meta: 'textScore' } };
      } else {
          sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
      }

      // 📂 Category filter
      if (category) {
          query.category = category;
      }

      // 🧭 Location filter (by state)
      if (location) {
          query["location.state"] = location;
      }

      // 💰 Price filter
      if (minPrice || maxPrice) {
          query.price = {};
          if (minPrice) query.price.$gte = parseFloat(minPrice);
          if (maxPrice) query.price.$lte = parseFloat(maxPrice);
      }

      // 📍 Geospatial filter
      if (lat && lng) {
          query["location.coordinates"] = {
              $near: {
                  $geometry: {
                      type: "Point",
                      coordinates: [parseFloat(lng), parseFloat(lat)]
                  },
                  $maxDistance: parseInt(radius),
                  $minDistance: 0
              }
          };
      }

      // 📄 Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // 🔎 Run query
      const cursor = services.find(query, { projection })
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit));

      const results = await cursor.toArray();
      const total = await services.countDocuments(query);

      const responseData = {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          results
      };

      // 📦 Cache the response for 5 minutes
      await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData));

      return responseData;
  } catch (error) {
      console.error("❌ fetchService error:", error);
      throw new Error("Internal server error");
  }
};
const { getServicesCollection } = require("../config/db");
const { getChannel } = require("../utils/rabbitmq");
const crypto = require("crypto");
const redisClient = require("../config/redisClient");
const { MeiliSearch } = require("meilisearch");
const meiliClient = new MeiliSearch({
  host: "http://127.0.0.1:7700",
  // apiKey: 'your_api_key' // optional
});

exports.createService = async (serviceData) => {
  // Add timestamp
  const { nanoid } = await import("nanoid");
  const serviceId = `ss_${nanoid(10)}`;

  serviceData.serviceId = serviceId;
  serviceData.createdAt = new Date();

  // Validate required fields
  const requiredFields = ["title", "category", "price", "location", "sellerId"];
  const missing = requiredFields.filter((field) => !serviceData[field]);
  if (missing.length) {
    throw { status: 400, message: `Missing fields: ${missing.join(", ")}` };
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

// exports.fetchService = async (queryParams) => {
//   const {
//       q,
//       category,
//       location,
//       minPrice,
//       maxPrice,
//       sortBy = 'createdAt',
//       sortOrder = 'desc',
//       page = 1,
//       limit = 10,
//       lat,
//       lng,
//       radius = 10000
//   } = queryParams;

//   try {
//       // 🔐 Create cache key
//       const cacheKey = crypto
//           .createHash('md5')
//           .update(JSON.stringify(queryParams))
//           .digest('hex');

//       // ⚡ Check Redis cache
//       const cached = await redisClient.get(cacheKey);
//       if (cached) {
//           return JSON.parse(cached);
//       }

//       const services = getServicesCollection();

//       let query = {};
//       let projection = {};
//       let sortOptions = {};

//       // 📝 Text search
//       if (q) {
//           query.$text = { $search: q };
//           projection = { score: { $meta: 'textScore' } };
//           sortOptions = { score: { $meta: 'textScore' } };
//       } else {
//           sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
//       }

//       // 📂 Category filter
//       if (category) {
//           query.category = category;
//       }

//       // 🧭 Location filter (by state)
//       if (location) {
//           query["location.state"] = location;
//       }

//       // 💰 Price filter
//       if (minPrice || maxPrice) {
//           query.price = {};
//           if (minPrice) query.price.$gte = parseFloat(minPrice);
//           if (maxPrice) query.price.$lte = parseFloat(maxPrice);
//       }

//       // 📍 Geospatial filter
//       if (lat && lng) {
//           query["location.coordinates"] = {
//               $near: {
//                   $geometry: {
//                       type: "Point",
//                       coordinates: [parseFloat(lng), parseFloat(lat)]
//                   },
//                   $maxDistance: parseInt(radius),
//                   $minDistance: 0
//               }
//           };
//       }

//       // 📄 Pagination
//       const skip = (parseInt(page) - 1) * parseInt(limit);

//       // 🔎 Run query
//       const cursor = services.find(query, { projection })
//           .sort(sortOptions)
//           .skip(skip)
//           .limit(parseInt(limit));

//       const results = await cursor.toArray();
//       const total = await services.countDocuments(query);

//       const responseData = {
//           total,
//           page: parseInt(page),
//           limit: parseInt(limit),
//           results
//       };

//       // 📦 Cache the response for 5 minutes
//       await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData));

//       return responseData;
//   } catch (error) {
//       console.error("❌ fetchService error:", error);
//       throw new Error("Internal server error");
//   }
// };

exports.fetchService = async (queryParams) => {
  const {
    q,
    category,
    location,
    minPrice = 0,
    maxPrice = 1000000,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    limit = 10,
    lat,
    lng,
    radius = 10000,
  } = queryParams;

  console.log("coming here");

  try {
    // 🔐 Create cache key
    const cacheKey = crypto
      .createHash("md5")
      .update(JSON.stringify(queryParams))
      .digest("hex");

    // ⚡ Check Redis cache
    //   const cached = await redisClient.get(cacheKey);
    //   console.log(cached)
    //   if (cached) {
    //     return JSON.parse(cached);
    //   }

    // 🧪 DEBUG: Check if index exists and has documents
    const index = meiliClient.index("services");
    const indexStats = await index.getStats();
    console.log("📊 Index stats:", indexStats);

    if (indexStats.numberOfDocuments === 0) {
      console.log("⚠️ No documents in index! Run sync first.");
      return {
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit),
        results: [],
      };
    }

    // 🧠 Build Meilisearch filter
    const filters = [
      category ? `category = "${category}"` : null,
      location ? `location.state = "${location}"` : null,
      `price >= ${minPrice}`,
      `price <= ${maxPrice}`,
    ].filter(Boolean);

    console.log("🔍 Filters:", filters);

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const searchParams = {
      filter: filters.length > 0 ? filters.join(" AND ") : undefined,
      offset,
      limit: parseInt(limit),
      sort: [`${sortBy}:${sortOrder}`],
    };

    console.log("🔍 Search params:", { q: q || "", ...searchParams });

    // 🔍 Search via Meilisearch
    const searchResult = await index.search(q || "", searchParams);

    console.log("📝 Search result:", {
      query: q || "",
      estimatedTotalHits: searchResult.estimatedTotalHits,
      hits: searchResult.hits.length,
      processingTimeMs: searchResult.processingTimeMs,
    });

    // 🧪 DEBUG: If no results, try a simple search without filters
    if (searchResult.hits.length === 0) {
      console.log("🧪 Trying simple search without filters...");
      const simpleSearch = await index.search(q || "");
      console.log("Simple search results:", simpleSearch.hits.length);

      if (simpleSearch.hits.length > 0) {
        console.log("Sample document:", simpleSearch.hits[0]);
      }
    }

    const responseData = {
      total: searchResult.estimatedTotalHits,
      page: parseInt(page),
      limit: parseInt(limit),
      results: searchResult.hits,
    };

    // 📦 Cache the response for 5 minutes
    await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData));

    return responseData;
  } catch (error) {
    console.error("❌ fetchService error:", error);
    throw new Error("Internal server error");
  }
};

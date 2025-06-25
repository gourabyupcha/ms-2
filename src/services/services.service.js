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

exports.fetchLatestService = async () => {
  try {
    const index = meiliClient.index("services");
    const result = await index.search("", {
      sort: ["createdAt:desc"],
      limit: 5,
    });
    const responseData = {
      results: result.hits,
    };
    return responseData;
  } catch (error) {
    console.error("Error fetching latest service:", error);
    throw { status: 500, message: "Internal server error" };
  }
};

exports.fetchServiceById = async (serviceId) => {
  try {
    const services = getServicesCollection();

    const service = await services.findOne({ serviceId });
    if (!service) throw new Error("Service not found");

    // Increment view count
    const updatedService = await services.findOneAndUpdate(
      { serviceId },
      { $inc: { views: 1 } },
      { returnDocument: "after" }
    );

    // Recalculate popularityScore (simple version)
    const views = updatedService.views || 0;
    const bookings = updatedService.confirmedBookingCount || 0;
    const ratings = updatedService.ratings || 0;

    const popularityScore = views * 0.5 + bookings * 2 + ratings * 5;

    // Update popularityScore in MongoDB
    await services.updateOne({ serviceId }, { $set: { popularityScore } });

    // Sync with Meilisearch
    const index = meiliClient.index("services");
    await index.addDocuments([
      {
        ...updatedService,
        id: updatedService._id.toString(),
        popularityScore,
      },
    ]);

    return updatedService;
  } catch (er) {
    console.error("Error fetching latest service:", er);
    throw { status: 500, message: "Internal server error" };
  }
};

exports.fetchPopularService = async (body) => {
  try {
    const { limit = 10, category, location } = body;

    const index = meiliClient.index("services");

    const filters = [];
    if (category) filters.push(`category = "${category}"`);
    if (location) filters.push(`location.state = "${location}"`);

    const result = await index.search("", {
      filter: filters.length ? filters : undefined,
      sort: ["popularityScore:desc"],
      limit,
    });

    const responseData = {
      total: result.estimatedTotalHits,
      results: result.hits,
    };

    return responseData;
  } catch (er) {
    console.error("Error fetching latest service:", er);
    throw { status: 500, message: "Internal server error" };
  }
};

exports.fetctServicesCatagories = async () => {
  try {
    const services = getServicesCollection();
    const categories = await services
      .find({}, { projection: { category: 1, _id: 0 } })
      .toArray();
    const categorySet = new Set(categories.map((doc) => doc.category));
    const responseData = {
      total: categorySet.size,
      results: Array.from(categorySet),
    };
    return responseData;
  } catch (er) {
    console.error("Error fetching latest service:", er);
    throw { status: 500, message: "Internal server error" };
  }
};

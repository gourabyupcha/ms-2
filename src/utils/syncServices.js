// syncServices.js

const { MeiliSearch } = require("meilisearch");
const { getServicesCollection } = require("../config/db");
const { sanitizeServicesForMeiliSearch, validateMeiliSearchDocument } = require('./documentSanitizer');

const meili = new MeiliSearch({ host: "http://localhost:7700" });

exports.syncServices = async () => {
  try {
    const servicesCollection = getServicesCollection();
    const services = await servicesCollection.find().toArray();
    if (services.length === 0) {
      console.log("⚠️ No services found in MongoDB!");
      return;
    }
    // console.log("🧹 Sanitizing documents...");
    const sanitizedDocuments = sanitizeServicesForMeiliSearch(services);
    
    // console.log("✨ Sample sanitized document:", JSON.stringify(sanitizedDocuments[0], null, 2));
    const invalidDocs = [];
    sanitizedDocuments.forEach((doc, index) => {
      const validation = validateMeiliSearchDocument(doc);
      if (!validation.isValid) {
        invalidDocs.push({ index, issues: validation.issues });
      }
    });

    if (invalidDocs.length > 0) {
      console.warn("⚠️ Found invalid documents:", invalidDocs);
      // Continue anyway, but log the issues
    }

    // Create or get index
    let index;
    try {
      const task = await meili.createIndex("services", { primaryKey: "id" });
      // console.log("✅ Index creation task:", task);
      index = meili.index("services");
    } catch (e) {
      if (e.code !== "index_already_exists") {
        throw e;
      }
      console.log("✅ Index already exists");
      index = meili.index("services");
    }

    // Configure searchable attributes
    // console.log("🔧 Configuring searchable attributes...");
    await index.updateSearchableAttributes([
      "title",
      "description",
      "tags",
      "location.city",
      "location.state",
      "sellerId",
      "category"
    ]);

    // Configure filterable attributes
    // console.log("🔧 Configuring filterable attributes...");
    await index.updateFilterableAttributes([
      "price",
      "category",
      "location.state",
      "location.city",
      "sellerId"
    ]);

    // Configure sortable attributes
    // console.log("🔧 Configuring sortable attributes...");
    await index.updateSortableAttributes(["createdAt", "price"]);

    // Clear existing documents (optional - remove if you want to keep existing)
    // console.log("🗑️ Clearing existing documents...");
    try {
      await index.deleteAllDocuments();
      // Wait a bit for deletion to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (e) {
      console.log("No existing documents to clear");
    }

    // Add sanitized documents
    // console.log(`📝 Adding ${sanitizedDocuments.length} documents to MeiliSearch...`);
    const addTask = await index.addDocuments(sanitizedDocuments);
    // console.log("📝 Add documents task:", addTask);

    // Wait for indexing to complete
    // console.log("⏳ Waiting for documents to be indexed...");


    // Verify documents were added
    const statsAfter = await index.getStats();
    // console.log("📊 Final index stats:", statsAfter);

    // // Test search functionality
    // console.log("🔍 Testing search functionality...");
    
    // // Test 1: Empty search (should return all)
    // const allResults = await index.search("", { limit: 3 });
    // console.log("🔍 All documents test:", {
    //   totalHits: allResults.estimatedTotalHits,
    //   hitCount: allResults.hits.length,
    //   sampleTitles: allResults.hits.map(h => h.title)
    // });

    // // Test 2: Search by title
    // if (allResults.hits.length > 0) {
    //   const firstTitle = allResults.hits[0].title;
    //   const titleSearch = await index.search(firstTitle.split(' ')[0]);
    //   console.log("🔍 Title search test:", {
    //     query: firstTitle.split(' ')[0],
    //     hits: titleSearch.hits.length
    //   });
    // }

    // // Test 3: Filter by category
    // const categoryFilter = await index.search("", { 
    //   filter: "category = photography",
    //   limit: 5 
    // });
    // console.log("🔍 Category filter test:", {
    //   filter: "category = photography",
    //   hits: categoryFilter.hits.length
    // });

    console.log(`✅ Sync completed successfully! ${statsAfter.numberOfDocuments} documents indexed`);
    
  } catch (err) {
    console.error("❌ Failed to sync services:", err);
    console.error("❌ Stack trace:", err.stack);
  }
};
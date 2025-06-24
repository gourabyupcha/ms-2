// db.js

const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;

if (!uri) {
  throw new Error("MONGO_URI not defined in .env");
}

let client;
let db;

// Connect once and reuse the connection
async function connectToDatabase() {
  if (db) return db;

  client = new MongoClient(uri, {
    serverApi: ServerApiVersion.v1
    // Removed: useUnifiedTopology
  });

  try {
    await client.connect();
    db = client.db("service_marketplace_db"); // Name your DB here
    console.log("✅ Connected to MongoDB");
    return db;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
}

function getServicesCollection() {
  if (!db) {
    throw new Error("Database not connected. Call connectToDatabase() first.");
  }
  return db.collection("services");
}

function getMenusCollection(){
  if (!db) {
    throw new Error("Database not connected. Call connectToDatabase() first.");
  }
  return db.collection("menus");
}

function getReviewsCollection(){
  if (!db) {
    throw new Error("Database not connected. Call connectToDatabase() first.");
  }
  return db.collection("reviews");
}

module.exports = {
  connectToDatabase,
  getServicesCollection,
  getMenusCollection,
  getReviewsCollection
};

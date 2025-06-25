const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config()

async function updateConfirmedBookingCounts() {
    const uri = process.env.MONGO_URI; // Update with your MongoDB URI
    const dbName = 'service_marketplace_db';     // Replace with your DB name

    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(dbName);
        const bookings = db.collection('bookings');
        const services = db.collection('services');

        // Step 1: Aggregate confirmed bookings count per serviceId
        const confirmedCounts = await bookings.aggregate([
            { $match: { status: 'confirmed' } },
            { $group: { _id: '$serviceId', count: { $sum: 1 } } }
        ]).toArray();

        // Step 2: Update each service with the confirmed booking count
        for (const item of confirmedCounts) {
            const serviceId = item._id;
            const count = item.count;

            const res = await services.updateOne(
                { serviceId: serviceId },
                { $set: { confirmedBookingCount: count } }
            );
        }

        console.log('Confirmed booking counts updated successfully.');
    } catch (err) {
        console.error('Error updating confirmed booking counts:', err);
    } finally {
        await client.close();
    }
}

updateConfirmedBookingCounts();

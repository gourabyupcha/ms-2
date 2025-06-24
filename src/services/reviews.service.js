const { getServicesCollection, getReviewsCollection } = require('../config/db');

exports.patchReview = async (data) => {
  const servicesCollection = await getServicesCollection();
  const reviewsCollection = await getReviewsCollection();

  const { serviceId, userId, rating, comment } = data;

  if (!serviceId || !userId || typeof rating !== 'number') {
    throw new Error('Missing or invalid fields');
  }

  // Step 1: Find the service document by serviceId
  const serviceDoc = await servicesCollection.findOne({ serviceId });

  if (!serviceDoc) {
    throw new Error('Service not found');
  }

  // const userObjectId = new ObjectId(userId); // If userId is an ObjectId string

  // Step 2: Insert the new review (using the original serviceId string)
  const review = {
    serviceId,              // <-- This is the user-provided string
    userId: userId,
    rating,
    comment,
    createdAt: new Date()
  };

  await reviewsCollection.insertOne(review);

  // Step 3: Recalculate stats using serviceId (string) now
  const aggregation = await reviewsCollection.aggregate([
    { $match: { serviceId } },
    {
      $group: {
        _id: '$serviceId',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]).toArray();

  if (aggregation.length === 0) {
    throw new Error('Failed to calculate review stats.');
  }

  let { averageRating, reviewCount } = aggregation[0];
  averageRating = Math.round(averageRating * 10) / 10  

  // Step 4: Update the service document (found by serviceId)
  await servicesCollection.updateOne(
    { serviceId },
    {
      $set: {
        averageRating,
        reviewCount
      }
    }
  );

  return { message: 'Review added and service updated.' };
};

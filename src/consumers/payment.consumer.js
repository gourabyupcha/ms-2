
const { getBookingsCollection } = require("../config/db");
const { getChannel } = require("../utils/rabbitmq");
const { ObjectId } = require("mongodb");

async function consumePaymentSuccess() {
  const channel = getChannel();
  await channel.assertQueue("payment.success");

  channel.consume("payment.success", async (msg) => {
    if (!msg) return;

    const { bookingId } = JSON.parse(msg.content.toString());
    console.log("📥 Received payment.success for:", bookingId);

    try {
      const db = getBookingsCollection();

      const result = await db.updateOne(
        { bookingId }, // no ObjectId conversion
        {
          $set: {
            status: "confirmed",
            updatedAt: new Date()
          }
        },
      );

      if (result.modifiedCount === 0) {
        console.warn("⚠️ No booking found with ID:", bookingId);
      } else {
        console.log("✅ Booking confirmed:", bookingId);
      }
    } catch (error) {
      console.error("❌ Error updating booking:", error);
      // Optional: consider not acknowledging the message to retry later
    }

    channel.ack(msg);
  });
}

module.exports = { consumePaymentSuccess };

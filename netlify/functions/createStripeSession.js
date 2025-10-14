const Stripe = require("stripe");
const admin = require("firebase-admin");

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://partybooking-ecdf1-default-rtdb.firebaseio.com",
  });
}

const db = admin.database();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event, context) {
  try {
    const { eventId, tickets, totalAmount, userId, bookingId } = JSON.parse(event.body);

    // Fetch event details
    const snapshot = await db.ref(`events/${eventId}`).once("value");
    if (!snapshot.exists())
      return { statusCode: 400, body: JSON.stringify({ error: "Event not found" }) };
    const eventData = snapshot.val();
    if (!eventData.stripeAccountId)
      return { statusCode: 400, body: JSON.stringify({ error: "Merchant not linked" }) };

    const connectedAccountId = eventData.stripeAccountId;
    const platformFee = Math.round(totalAmount * 0.1 * 100);
    const pricePerTicket = totalAmount / tickets;

    // Fetch user details from Firebase Auth
    const userRecord = await admin.auth().getUser(userId);
    const userName = userRecord.displayName || userRecord.email;

    // Save booking in Firebase with username
    await db.ref(`bookings/${bookingId}`).set({
      bookingId,
      eventId,
      eventName: eventData.name,
      tickets,
      totalAmount,
      image: eventData.imageUrl || "",
      status: "pending",
      bookedBy: userName,  // <-- store username/email here
      createdAt: new Date().toISOString()
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: eventData.name },
          unit_amount: Math.round(pricePerTicket * 100)
        },
        quantity: tickets
      }],
      mode: "payment",
      success_url: `https://preethievents.netlify.app/success.html?bookingId=${bookingId}`,
      cancel_url: `https://preethievents.netlify.app/cancel.html`,
      metadata: { bookingId },
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: { destination: connectedAccountId }
      }
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };

  } catch(err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

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
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: "No request body" }) };
    }

    const { eventId, tickets, totalAmount, userId, bookingId, ticketType } = JSON.parse(event.body);

    if (!eventId || !tickets || !totalAmount || !userId || !bookingId || !ticketType) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing required parameters" }) };
    }

    // Fetch event details
    const snapshot = await db.ref(`events/${eventId}`).once("value");
    if (!snapshot.exists()) {
      return { statusCode: 400, body: JSON.stringify({ error: "Event not found" }) };
    }
    const eventData = snapshot.val();

    if (!eventData.stripeAccountId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Merchant not linked" }) };
    }

    // Check ticket availability
    const ticketsInfo = eventData.tickets?.[ticketType] || null;
    if (!ticketsInfo) {
      return { statusCode: 400, body: JSON.stringify({ error: `${ticketType} tickets not available` }) };
    }

    if (ticketsInfo.qty != null && tickets > ticketsInfo.qty) {
      return { statusCode: 400, body: JSON.stringify({ error: `Only ${ticketsInfo.qty} ${ticketType} tickets left` }) };
    }

    const connectedAccountId = eventData.stripeAccountId;

    // Calculate dynamic split
    const totalAmountCents = Math.round(totalAmount * 100);       // total in cents
    const connectedAmount = Math.round(totalAmountCents * 0.1);   // 10% to connected account (Rohan)
    const mainAmount = totalAmountCents - connectedAmount;         // 90% stays in main account (Preethi)

    // Fetch user details from Firebase Auth
    const userRecord = await admin.auth().getUser(userId);
    const userName = userRecord.displayName || userRecord.email;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `${eventData.name} (${ticketType})` },
          unit_amount: totalAmountCents
        },
        quantity: 1
      }],
      mode: "payment",
      success_url: `https://preethievents.netlify.app/success.html?bookingId=${bookingId}`,
      cancel_url: `https://preethievents.netlify.app/cancel.html`,
      metadata: { bookingId, ticketType, eventId, tickets },
      payment_intent_data: {
        application_fee_amount: mainAmount,           // 90% stays in main account
        transfer_data: { destination: connectedAccountId } // 10% goes to connected account
      }
    });

    // Save booking in Firebase (status pending initially)
    await db.ref(`bookings/${bookingId}`).set({
      bookingId,
      eventId,
      eventName: eventData.name,
      tickets,
      ticketType,
      totalAmount,
      image: eventData.imageUrl || "",
      status: "pending", // payment not completed yet
      bookedBy: userName,
      bookedById: userId,
      createdAt: new Date().toISOString(),
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };

  } catch(err) {
    console.error("Stripe Session Error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

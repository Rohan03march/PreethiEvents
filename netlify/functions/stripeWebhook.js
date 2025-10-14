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

// Use your Stripe webhook secret from Stripe Dashboard
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async function(event, context) {
  try {
    // Access raw body
    const rawBody = event.body;

    const sig = event.headers['stripe-signature'];

    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;
      const bookingId = session.metadata.bookingId;

      if (bookingId) {
        await db.ref(`bookings/${bookingId}`).update({
          status: "paid",
          paidAt: new Date().toISOString()
        });

        // Update tickets
        const bookingSnapshot = await db.ref(`bookings/${bookingId}`).once("value");
        const bookingData = bookingSnapshot.val();
        const eventRef = db.ref(`events/${bookingData.eventId}`);
        const eventSnapshot = await eventRef.once("value");
        const eventData = eventSnapshot.val();
        const newTicketsLeft = eventData.tickets - bookingData.tickets;

        await eventRef.update({ tickets: newTicketsLeft });
      }
    }

    return { statusCode: 200, body: "Webhook received" };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: `Error: ${err.message}` };
  }
};


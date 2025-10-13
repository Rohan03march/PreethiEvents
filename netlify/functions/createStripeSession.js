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
    const { eventId, tickets, totalAmount } = JSON.parse(event.body);

    // Fetch event details
    const eventSnapshot = await db.ref(`events/${eventId}`).once("value");
    if (!eventSnapshot.exists()) {
      return { statusCode: 400, body: JSON.stringify({ error: "Event not found" }) };
    }
    const eventData = eventSnapshot.val();

    if (tickets > eventData.tickets) {
      return { statusCode: 400, body: JSON.stringify({ error: "Not enough tickets left" }) };
    }

    const bookingId = "BK" + Date.now();

    // Save booking in Firebase
    await db.ref(`bookings/${bookingId}`).set({
      bookingId,
      eventId,
      eventName: eventData.name,
      tickets,
      totalAmount,
      image: eventData.imageUrl || "",
      status: "pending",
      createdAt: new Date().toISOString()
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: eventData.name },
            unit_amount: totalAmount * 100
          },
          quantity: tickets
        }
      ],
      mode: "payment",
      success_url: `https://preethievents.netlify.app/success.html?bookingId=${bookingId}`,
      cancel_url: `https://preethievents.netlify.app/cancel.html`
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

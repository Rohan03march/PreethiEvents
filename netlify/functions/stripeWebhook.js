// const Stripe = require("stripe");
// const admin = require("firebase-admin");

// if (!admin.apps.length) {
//   const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     databaseURL: "https://partybooking-ecdf1-default-rtdb.firebaseio.com",
//   });
// }

// const db = admin.database();
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// exports.handler = async function(event, context) {
//   try {
//     const rawBody = event.body;
//     const sig = event.headers['stripe-signature'];

//     let stripeEvent;
//     try {
//       stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
//     } catch (err) {
//       console.error("Webhook signature verification failed:", err.message);
//       return { statusCode: 400, body: `Webhook Error: ${err.message}` };
//     }

//     if (stripeEvent.type === "checkout.session.completed") {
//       const session = stripeEvent.data.object;
//       const bookingId = session.metadata.bookingId;
//       const ticketType = session.metadata.ticketType; // basic, silver, gold

//       if (!bookingId || !ticketType) return { statusCode: 400, body: "Missing bookingId or ticketType" };

//       // Update booking status
//       await db.ref(`bookings/${bookingId}`).update({
//         status: "paid",
//         paymentId: session.payment_intent,
//         paidAt: new Date().toISOString()
//       });

//       // Update tickets for the selected type
//       const bookingSnapshot = await db.ref(`bookings/${bookingId}`).once("value");
//       const bookingData = bookingSnapshot.val();
//       const ticketsBooked = bookingData.tickets;

//       const ticketRef = db.ref(`events/${bookingData.eventId}/tickets/${ticketType}`);
//       const ticketSnapshot = await ticketRef.once("value");

//       if (ticketSnapshot.exists()) {
//         const currentQty = ticketSnapshot.val().qty;
//         if (currentQty != null) { // Only decrement if qty is finite
//           const newQty = currentQty - ticketsBooked;
//           await ticketRef.update({ qty: newQty < 0 ? 0 : newQty });
//         }
//       }
//     }

//     return { statusCode: 200, body: "Webhook received" };
//   } catch (err) {
//     console.error(err);
//     return { statusCode: 500, body: `Error: ${err.message}` };
//   }
// };




const Stripe = require("stripe");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://partybooking-ecdf1-default-rtdb.firebaseio.com",
  });
}

const db = admin.database();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async function(event, context) {
  try {
    const rawBody = event.body;
    const sig = event.headers['stripe-signature'];
    let stripeEvent;

    try {
      stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err.message);
      return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    console.log("✅ Stripe event received:", stripeEvent.type);

    // ---- SUCCESSFUL PAYMENT ----
    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;
      const bookingId = session.metadata?.bookingId;
      const ticketType = session.metadata?.ticketType;

      if (!bookingId || !ticketType) return { statusCode: 400, body: "Missing bookingId or ticketType" };

      // Update booking as paid
      await db.ref(`bookings/${bookingId}`).update({
        status: "paid",
        paymentId: session.payment_intent,
        paidAt: new Date().toISOString()
      });

      // Decrease ticket count
      const bookingSnap = await db.ref(`bookings/${bookingId}`).once("value");
      const bookingData = bookingSnap.val();
      const ticketsBooked = bookingData.tickets;

      const ticketRef = db.ref(`events/${bookingData.eventId}/tickets/${ticketType}`);
      const ticketSnap = await ticketRef.once("value");

      if (ticketSnap.exists()) {
        const currentQty = ticketSnap.val().qty;
        if (currentQty != null) {
          const newQty = currentQty - ticketsBooked;
          await ticketRef.update({ qty: newQty < 0 ? 0 : newQty });
        }
      }

      console.log(`✅ Booking ${bookingId} marked as PAID.`);
    }

    // ---- PAYMENT FAILED ----
    else if (stripeEvent.type === "payment_intent.payment_failed") {
      const intent = stripeEvent.data.object;
      const bookingId = intent.metadata?.bookingId;

      if (bookingId) {
        await db.ref(`bookings/${bookingId}`).update({
          status: "failed",
          failedReason: intent.last_payment_error?.message || "Payment failed",
          updatedAt: new Date().toISOString(),
        });
        console.log(`⚠️ Booking ${bookingId} marked as FAILED.`);
      }
    }

    // ---- SESSION EXPIRED (user never finished payment) ----
    else if (stripeEvent.type === "checkout.session.expired") {
      const session = stripeEvent.data.object;
      const bookingId = session.metadata?.bookingId;

      if (bookingId) {
        await db.ref(`bookings/${bookingId}`).update({
          status: "cancelled",
          updatedAt: new Date().toISOString(),
        });
        console.log(`🚫 Booking ${bookingId} marked as CANCELLED.`);
      }
    }

    return { statusCode: 200, body: "Webhook processed successfully" };

  } catch (err) {
    console.error("🔥 Webhook processing error:", err);
    return { statusCode: 500, body: `Error: ${err.message}` };
  }
};

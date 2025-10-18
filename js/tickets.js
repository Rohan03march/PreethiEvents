import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA3ChaO6pXKubN4WeVffJK5q0tPmpT1XEc",
  authDomain: "partybooking-ecdf1.firebaseapp.com",
  databaseURL: "https://partybooking-ecdf1-default-rtdb.firebaseio.com",
  projectId: "partybooking-ecdf1",
  storageBucket: "partybooking-ecdf1.appspot.com",
  messagingSenderId: "119112973933",
  appId: "1:119112973933:web:87037ff1b10958bb118964",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const ticketsContainer = document.getElementById("ticketsContainer");

auth.onAuthStateChanged(user => {
  if (!user) {
    ticketsContainer.innerHTML = `<p class="no-booking">Please log in to see your bookings.</p>`;
    return;
  }

  const bookingsQuery = query(ref(db, "bookings"), orderByChild("bookedById"), equalTo(user.uid));

  get(bookingsQuery).then(snapshot => {
    const data = snapshot.val();
    ticketsContainer.innerHTML = "";
    if (data) {
      for (let bookingId in data) {
        const booking = data[bookingId];
        const ticketCard = document.createElement("div");
        ticketCard.classList.add("ticket-card");
        ticketCard.innerHTML = `
          <div class="ticket-cutout-left"></div>
          <div class="ticket-cutout-right"></div>
          ${booking.image ? `<img src="${booking.image}" alt="Event Image" class="ticket-image">` : ""}
          <div class="ticket-info">
            <p><strong>Event:</strong> ${booking.eventName || "N/A"}-<strong>${booking.ticketType}</strong></p>
            <p><strong>Tickets:</strong> ${booking.tickets || 0}</p>
            <p><strong>Booked By:</strong> ${booking.bookedBy || "N/A"}</p>
          </div>
          <div class="ticket-footer">
            <div id="qrcode-${booking.bookingId}" class="ticket-qr"></div>
            <p><strong>ID:</strong> ${booking.bookingId || bookingId}</p>
          </div>
        `;
        ticketsContainer.appendChild(ticketCard);

        // Generate QR code (booking ID only)
        new QRCode(document.getElementById(`qrcode-${booking.bookingId}`), {
          text: booking.bookingId,
          width: 80,
          height: 80,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
      }
    } else {
      ticketsContainer.innerHTML = `<p class="no-booking">No bookings found.</p>`;
    }
  }).catch(err => {
    console.error("Firebase fetch error:", err);
    ticketsContainer.innerHTML = `<p class="no-booking">Error loading bookings. See console for details.</p>`;
  });
});

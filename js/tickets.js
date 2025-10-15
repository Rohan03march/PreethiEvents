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

  // Query bookings where bookedById matches current user UID
  const bookingsQuery = query(ref(db, "bookings"), orderByChild("bookedById"), equalTo(user.uid));

  get(bookingsQuery)
    .then(snapshot => {
      const data = snapshot.val();
      ticketsContainer.innerHTML = ""; // clear previous content

      if (data) {
        for (let bookingId in data) {
          const booking = data[bookingId];

          const statusClass = booking.status === "paid" ? "ticket-status-paid" : "ticket-status-pending";

          const ticketCard = document.createElement("div");
          ticketCard.classList.add("ticket-card");
          ticketCard.innerHTML = `
            ${booking.image ? `<img src="${booking.image}" alt="Event Image">` : ""}
            <div class="ticket-info">
              <p><strong>Event:</strong> ${booking.eventName || "N/A"}</p>
              <p><strong>Tickets:</strong> ${booking.tickets || 0}</p>
              <p><strong>Total Amount:</strong> $${booking.totalAmount || 0}</p>
              <p><strong>Status:</strong> <span class="${statusClass}">${booking.status ? booking.status.toUpperCase() : "PENDING"}</span></p>
              <p><strong>Booking ID:</strong> ${booking.bookingId || bookingId}</p>
              <p><strong>Booked By:</strong> ${booking.bookedBy || "N/A"}</p>
            </div>
            <div class="ticket-barcode"></div>
          `;
          ticketsContainer.appendChild(ticketCard);
        }
      } else {
        ticketsContainer.innerHTML = `<p class="no-booking">No bookings found.</p>`;
      }
    })
    .catch(err => {
      console.error("Firebase fetch error:", err);
      ticketsContainer.innerHTML = `<p class="no-booking">Error loading bookings. See console for details.</p>`;
    });
});

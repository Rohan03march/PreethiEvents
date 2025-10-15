    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
    import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

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
    const db = getDatabase(app);

    // Get bookingId from URL
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get("bookingId");

    const statusEl = document.getElementById("bookingStatus");
    const detailsEl = document.getElementById("bookingDetails");

    if (bookingId) {
      get(ref(db, `bookings/${bookingId}`)).then(snapshot => {
        const booking = snapshot.val();
        if (booking) {
          const statusClass = booking.status === "paid" ? "status-paid" : "status-pending";
          statusEl.textContent = `Booking Status: ${booking.status.toUpperCase()}`;
          statusEl.className = statusClass;

          detailsEl.innerHTML = `
            <p><strong>Event:</strong> ${booking.eventName}</p>
            <p><strong>Tickets:</strong> ${booking.tickets}</p>
            <p><strong>Total Amount:</strong> $${booking.totalAmount}</p>
            <p><strong>Booked By:</strong> ${booking.bookedBy}</p>
          `;
        } else {
          statusEl.textContent = "Invalid Booking";
          statusEl.className = "status-invalid";
        }
      }).catch(err => {
        statusEl.textContent = "Error checking booking";
        statusEl.className = "status-invalid";
        console.error(err);
      });
    } else {
      statusEl.textContent = "No booking ID provided";
      statusEl.className = "status-invalid";
    }
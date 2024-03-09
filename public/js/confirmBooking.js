document.addEventListener("DOMContentLoaded", function () {
  const confirmButton = document.getElementById("confirm-booking");
  const voucherSelect = document.getElementById("voucher-select");

  function calculateTotalPrice() {
    const allSeats = document.querySelectorAll("li[data-price]");
    let totalPrice = 0;
    let discountAmount = 0;

    let discountRate = 0;
    let remainingUses = 0;
    
    if (voucherSelect && voucherSelect.value) {
        const selectedVoucherOption = voucherSelect.options[voucherSelect.selectedIndex];
        discountRate = parseFloat(selectedVoucherOption.getAttribute("data-discount")) || 0;
        remainingUses = parseInt(selectedVoucherOption.getAttribute("data-remaininguses")) || 0;
    }
    
    const voucherAppliedSeats = document.querySelectorAll(
      'input[name="applyVoucher"]:checked'
    );

    if (voucherAppliedSeats.length > remainingUses) {
      alert(
        `You cannot apply this voucher to more than ${remainingUses} ticket(s). Please uncheck some tickets.`
      );
      return null; // Return null to indicate a problem
    }

    allSeats.forEach((li, index) => {
      const price = parseFloat(li.getAttribute("data-price"));
      totalPrice += price;
      if (
        index < remainingUses &&
        voucherAppliedSeats[index] &&
        voucherAppliedSeats[index].checked
      ) {
        discountAmount += price * (discountRate / 100);
      }
    });

    totalPrice -= discountAmount;
    return totalPrice; // Return the total price for further processing
  }

  confirmButton.addEventListener("click", function (event) {
    event.preventDefault(); // Prevent the form from submitting traditionally

    const totalPrice = calculateTotalPrice(); // Calculate and show the total price
    if (totalPrice === null) {
      return; // Do not proceed if there's an issue with voucher application
    }

    alert(`Total Price: $${totalPrice.toFixed(2)}`); // Show the total price to the user

    // Since all seats are implicitly selected, gather all seat IDs
    const allSeatIds = Array.from(
      document.querySelectorAll("li[data-seat-id]")
    ).map((li) => li.getAttribute("data-seat-id"));

    // Identify which seats have vouchers applied
    const voucherApplications = Array.from(
      document.querySelectorAll('input[name="applyVoucher"]:checked')
    ).map((input) => input.value);
    const hallId = document.body.getAttribute("data-hall-id");
    const screeningId = document.body.getAttribute("data-screening-id");
    console.log("Hall ID:", hallId);
    console.log("Screening ID:", screeningId);

    const formData = {
      hallId: hallId,
      screeningId: screeningId,
      selectedSeats: allSeatIds, // All seats are selected
      voucherId: voucherSelect.value, // Send the selected voucher ID
      voucherApplications: voucherApplications, // Specific seat IDs where the voucher is applied
    };

    console.log(formData);

    // Send AJAX request to server to finalize booking
    fetch("/booking-processing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
    .then((response) => {
      if (!response.ok) {
        // If the server responded with an error status, parse and throw the error
        return response.json().then(data => Promise.reject(data));
      }
      return response.json();
    })
    .then((data) => {
      if (data.redirectURL) {
        window.location.href = data.redirectURL; // Redirect to confirmation page
      } else {
        console.log("Booking successful!");
        alert("Booking successful!");
      }
    })
    .catch((data) => {
      // This catch now handles parsed error data
      alert(`Booking failed: ${data.error || 'An unknown error occurred'}`);
    });    
  });
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('Document is fully loaded.');

    const seats = document.querySelectorAll('.seat:not(.reserved)');
    console.log(`Found ${seats.length} available seats.`);

    seats.forEach(seat => {
        seat.addEventListener('click', function() {
            console.log(`Seat clicked: ${this.dataset.seat}`);
            if (!this.classList.contains('reserved')) {
                this.classList.toggle('selected');
                console.log(`Seat selected: ${this.dataset.seat}`);
            }
        });
    });

    const proceedButton = document.getElementById('proceed-button');
    if (proceedButton) {
        proceedButton.addEventListener('click', function() {
            const hallId = document.body.getAttribute('data-hall-id');
            const screeningId = document.body.getAttribute('data-screening-id');
            const selectedSeats = Array.from(document.querySelectorAll('.seat.selected')).map(seat => ({
                seatID: seat.dataset.seatId, // Assuming each seat has a data-seat-id attribute
            }));

      
            fetch('/payment-processing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    hallId: hallId,
                    screeningId: screeningId,
                    selectedSeats: selectedSeats
                }),
            })
            .then(response => response.json())
            .then(data => {
                console.log('Success:', data);
                window.location.href = data.redirectURL; 
            })
            .catch((error) => {
                console.error('Error:', error);
                // Handle errors here
            });
        });
    } else {
        console.error('Proceed button not found.');
    }
});

// Establish the WebSocket connection
const socket = new WebSocket('ws://localhost:3000');

// Handle incoming messages
socket.onmessage = (event) => {
    console.log('Message from server', event.data);
};

// Send a message when the button is clicked
const button = document.getElementById("message");
button.addEventListener("click", () => {
    socket.send('hello');
});

// Send a message immediately when the connection is open
socket.onopen = () => {
    socket.send('hello');
};

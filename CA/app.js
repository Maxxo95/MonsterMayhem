// Establish the WebSocket connection

const socket = new WebSocket('ws://localhost:3000');

//  incoming messages to HTML
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.username) { // If the data contains username // meaning was succesfull
        document.getElementById("usernameOutput").textContent = `Username: ${data.username}`;
        document.getElementById("gamesPlayedOutput").textContent = `Games Played: ${data.gamesPlayed}`;
        document.getElementById("gamesWonOutput").textContent = `Games Won: ${data.gamesWon}`;
    } else if (data.error) {
        document.getElementById("messageOutput").textContent = "Invalid Credentials";
        console.error('Error from server', data.error);
    }
};


// Send a message when the button is clicked to the Index.js (backend)
const button = document.getElementById("message");
button.addEventListener("click", () => {
    const username = document.querySelector('input[name="username"]').value;
    const pass = document.querySelector('input[name="pass"]').value;
    const loginMessage = {
        type: 'login',
        username: username,
        pass: pass
    };
    socket.send(JSON.stringify(loginMessage));
});

socket.onopen = () => {
    console.log('WebSocket connection opened');
};

// Handle registration button  to /reg
const registrationButton = document.getElementById("registration");

registrationButton.addEventListener("click", () => {
    window.location.href = '/reg';
});






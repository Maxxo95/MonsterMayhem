// Establish the WebSocket connection

const socket = new WebSocket('ws://localhost:3000');
Boolean:looged = false;
//  incoming messages to HTML

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.username) { // If the data contains username // meaning was succesfull
        document.getElementById("usernameOutput").textContent = `Username: ${data.username}`;
        document.getElementById("gamesPlayedOutput").textContent = `Games Played: ${data.gamesPlayed}`;
        document.getElementById("gamesWonOutput").textContent = `Games Won: ${data.gamesWon}`;
        login(); 
        
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

function updateButtonVisibility() {
    const joinGameButton = document.getElementById('joingame');
    if (logged) {
        joinGameButton.style.display = 'block'; // Show the button
    } else {
        joinGameButton.style.display = 'none'; // Hide the button
    }
}





function login() {
    logged = true;
    updateButtonVisibility();
    updateUI();
}


function logout() {
    logged = false;
    updateButtonVisibility();
    updateUI();
}


function updateUI() {
    const joinGameButton = document.getElementById('joingame');
    const loginDiv = document.getElementById('login');
    const messageOutputDiv = document.getElementById('messageOutput');

    if (logged) {
        joinGameButton.style.display = 'block'; // Show the play button
        loginDiv.classList.remove('login-large');
        loginDiv.classList.add('login-small');
        messageOutputDiv.classList.remove('message-output-small');
        messageOutputDiv.classList.add('message-output-large');
    } else {
        joinGameButton.style.display = 'none'; // Hide the play button
        loginDiv.classList.remove('login-small');
        loginDiv.classList.add('login-large');
        messageOutputDiv.classList.remove('message-output-large');
        messageOutputDiv.classList.add('message-output-small');
    }
}

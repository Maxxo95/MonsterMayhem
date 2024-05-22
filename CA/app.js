// Establish the WebSocket connection

const socket = new WebSocket('ws://localhost:3000');

// Handle incoming messages
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.message) {
        // Assuming you want to display the message in an element with ID "messageOutput"
        document.getElementById("messageOutput").textContent = data.message;
    } else if (data.error) {
        document.getElementById("messageOutput").textContent = "Invalid Credentials";
        console.error('Error from server', data.error);
    }
};

// Send a message when the button is clicked
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

/*
const socket2 = io('ws://localhost:3000');
socket2.on('message', text => {

    const el = document.createElement('li');
    el.innerHTML = text;
    document.querySelector('ul').appendChild(el)

});

document.querySelector('button').onclick = () => {

    const text = document.querySelector('input').value;
    socket2.emit('message', text)

}*/

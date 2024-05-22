const socket = new WebSocket('ws://localhost:3000');

socket.onopen = () => {
    console.log('WebSocket connection opened');
};

const registrationForm = document.getElementById("registrationForm");
if (registrationForm) {
    document.getElementById("submitRegistration").addEventListener("click", () => {
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        const registrationMessage = {
            type: 'register',
            username: username,
            password: password

            
        };

        
        socket.send(JSON.stringify(registrationMessage));
    });
}

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (!data.error) { // If the data contains username // meaning was succesfull
        document.getElementById("messageOutput").textContent = "Welcome to Mayhem Monster!!  ";
    } else if (data.error) {
        document.getElementById("messageOutput").textContent = "Invalid Credentials";
        console.error('Error from server', data.error);
    }
};
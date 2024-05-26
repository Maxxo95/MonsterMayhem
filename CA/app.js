// Establish the WebSocket connection

const socket = new WebSocket('ws://localhost:3000');
Boolean:looged = false;
//  incoming messages to HTML




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


socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.username) { //for websocket requiring username succesfully
        username = data.username;
        document.getElementById("usernameOutput").textContent = `Username: ${data.username}`;
        document.getElementById("gamesPlayedOutput").textContent = `Games Played: ${data.gamesPlayed}`;
        document.getElementById("gamesWonOutput").textContent = `Games Won: ${data.gamesWon}`;
        login(); 
        createBoard();
    } else if (data.error) {
        document.getElementById("messageOutput").textContent = "Invalid Credentials";
        console.error('Error from server', data.error);
    } else if (data.players) {
        // Update the player board with the list of players
        for (let i = 0; i < data.players.length; i++) {
            document.getElementById(`player${i + 1}`).textContent = data.players[i];
        }
        document.getElementById("messageOutput").textContent = data.message || '';
    }
};

// Send a message when the join game button is clicked to the backend
const joinGameButton = document.getElementById("joingame");
joinGameButton.addEventListener("click", () => {
    if (username) {
        const joinGameMessage = {
            type: 'joinGame',
            username: username
        };
        socket.send(JSON.stringify(joinGameMessage));
    } else {
        document.getElementById("messageOutput").textContent = "You need to log in first.";
    }
});
/////////////////////////////////
///////////////////////////////////Board (May simplify if trouble when building game)
////////////////////////////////////
function createBoard() { //// Board Made with chat gp creating a board that has 10 by 10 and adding rows to label a-z horizontal and 1-9 vertical
    const board = document.getElementById('gameBoard');
    board.style.gridTemplateColumns = '50px repeat(10, 50px) 30px';
    board.style.gridTemplateRows = '50px repeat(10, 50px) 30px';

    const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

    // Create the top row of headers
    const emptyCorner = document.createElement('div');
    emptyCorner.classList.add('cell', 'header');
    board.appendChild(emptyCorner);

    for (let col = 0; col < 10; col++) {
        const headerCell = document.createElement('div');
        headerCell.classList.add('cell', 'header');
        headerCell.textContent = columns[col];
        board.appendChild(headerCell);
    }

    const emptyTopRight = document.createElement('div');
    emptyTopRight.classList.add('cell', 'header');
    board.appendChild(emptyTopRight);

    // Create the rows
    for (let row = 0; row < 10; row++) {
        const rowHeader = document.createElement('div');
        rowHeader.classList.add('cell', 'header');
        rowHeader.textContent = row;
        board.appendChild(rowHeader);

        for (let col = 0; col < 10; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = columns[col];
            cell.dataset.index = `${columns[col]}${row}`;
            board.appendChild(cell);
        }

        const rightRowHeader = document.createElement('div');
        rightRowHeader.classList.add('cell', 'header');
        board.appendChild(rightRowHeader);
    }

    // Create the bottom row of headers
    const emptyBottomLeft = document.createElement('div');
    emptyBottomLeft.classList.add('cell', 'header');
    board.appendChild(emptyBottomLeft);

    for (let col = 0; col < 10; col++) {
        const bottomHeaderCell = document.createElement('div');
        bottomHeaderCell.classList.add('cell', 'header');
        board.appendChild(bottomHeaderCell);
    }

    const emptyBottomRight = document.createElement('div');
    emptyBottomRight.classList.add('cell', 'header');
    board.appendChild(emptyBottomRight);
}




//////////////////////////////////////////////////
/////////////////////////////////////////////// CSS JS
//////////////////////////////////////////////// 


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

function updateButtonVisibility() {
    const joinGameButton = document.getElementById('joingame');
    if (logged) {
        joinGameButton.style.display = 'block'; // Show the button
    } else {
        joinGameButton.style.display = 'none'; // Hide the button
    }
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
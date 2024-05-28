// Establish the WebSocket connection

const socket = new WebSocket('ws://localhost:3000');
Boolean:looged = false;
let playerSide = null;
let currentPlayer = null;
// Send a message when the button is clicked to the Index.js (backend)
const button = document.getElementById("message");
/////////////////////// button log in 
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

// Handle registration button  to /reg
const registrationButton = document.getElementById("registration");

registrationButton.addEventListener("click", () => {
    window.location.href = '/reg';
});
// Handle play button 
// Send a message when the join game button is clicked to the backend
const joinGameButton = document.getElementById("joingame");
joinGameButton.addEventListener("click", () => {
    if (username) {
        const joinGameMessage = {
            type: 'joinGame',  
            username: username
        };
        socket.send(JSON.stringify(joinGameMessage)); // send info of the user wanting to join a game 
    } else {
        document.getElementById("messageOutput").textContent = "You need to log in first."; // if you click and are not logged in wont let u play 
    }
});
////////////////// socket connection 
socket.onopen = () => { 
    console.log('WebSocket connection opened');
    socket.send(JSON.stringify({ type: 'joinGame', username: username }));
   
};socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    console.log('Received data from server:', data);

    if (data.username) {
        username = data.username;
        document.getElementById("usernameOutput").textContent = `Username: ${data.username}`;
        document.getElementById("gamesPlayedOutput").textContent = `Games Played: ${data.gamesPlayed}`;
        document.getElementById("gamesWonOutput").textContent = `Games Won: ${data.gamesWon}`;
        login();
        createBoard();
    } else if (data.error) {
        document.getElementById("messageOutput").textContent = "Invalid Credentials";
        console.error('Error from server', data.error);
    }  if (data.players) {
        document.getElementById("messageOutput").innerHTML = `
            Players: ${data.players.join(', ')} <br>
            Monsters: ${JSON.stringify(data.playerMonsters)} <br>
            Eliminations: ${JSON.stringify(data.playerEliminations)} <br>
            Sides: ${data.sides} <br>
            First Player: ${data.currentPlayer} <br>
            ${data.message || 'Game is starting!'}
        `;
        updateBoard(data.board);
        playerSide = data.playerSides[username];
        currentPlayer = data.currentPlayer;
        console.log("Player Side:", playerSide);
        console.log("Current Player:", currentPlayer);
    } else if (data.board) {
        updateBoard(data.board);
        currentPlayer = data.currentPlayer;
        console.log("Current Player:", currentPlayer);
    } else if (data.currentPlayer) {
        currentPlayer = data.currentPlayer;
        document.getElementById("messageOutput").innerHTML += `<br>${data.message}`;
        console.log("Current Player Updated:", currentPlayer);
    }
};




/////////////////////////////////
///////////////////////////////////Board (May simplify if trouble when building game)
////////////////////////////////////
function createBoard() {
    const board = document.getElementById('gameBoard');
    board.style.gridTemplateColumns = '50px repeat(10, 50px) 30px';
    board.style.gridTemplateRows = '50px repeat(10, 50px) 30px';

    const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

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

    for (let row = 0; row < 10; row++) {
        const rowHeader = document.createElement('div');
        rowHeader.classList.add('cell', 'header');
        rowHeader.textContent = row + 1;
        board.appendChild(rowHeader);

        for (let col = 0; col < 10; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.dataset.index = `${columns[col]}${row + 1}`;
            cell.addEventListener('click', () => handleCellClick(row, col));
            board.appendChild(cell);
        }

        const rightRowHeader = document.createElement('div');
        rightRowHeader.classList.add('cell', 'header');
        board.appendChild(rightRowHeader);
    }

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

function handleCellClick(row, col) {
    // Validate the move based on the player's side
    const validMove = 
        (playerSide === 'top' && row === 0) ||
        (playerSide === 'bottom' && row === 9) ||
        (playerSide === 'left' && col === 0) ||
        (playerSide === 'right' && col === 9);

    if (!validMove) {
        alert('You can only place a monster on your designated side.');
        return;
    }

    // Check if it's the current player's turn
    if (currentPlayer !== username) {
        alert('It is not your turn.');
        return;
    }

    // Send the move to the server
    const monster = prompt("Enter the monster type (vampire, werewolf, ghost):");
    if (monster) {
        const message = JSON.stringify({ type: 'makeMove', monster: monster, row: row, col: col });
        socket.send(message);
    }
}

function updateBoard(board) {
    for (let row = 0; row < board.length; row++) {
        for (let col = 0; col < board[row].length; col++) {
            const cell = document.querySelector(`.cell[data-row='${row}'][data-col='${col}']`);
            cell.textContent = board[row][col] ? board[row][col] : '';
        }
    }
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
        
    }
}
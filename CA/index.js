const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const path = require('path');
const { WebSocketServer } = require('ws');
const http = require('http');
//const socketIO = require('socket.io');

// Web build
const PORT = process.argv[2] || 3000;
const app = express();
const httpServer = http.createServer(app);

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '.')));// location of app.js root 
/////////////////// Mongo 
const { MongoClient } = require('mongodb');
const uri = 'mongodb://localhost:27017';

/// Variables
let gameState = {};
let viewCount = 0;
let players = [];
const sides = ['North', 'South', 'East', 'West'];
////////////////////////////////////////////////// Routes
app.get('/', (req, res) => {
    console.log('Welcome Visitor');
    viewCount += 1;
    res.render('index', { viewCount });
});

//////////////////////  Sockets 
const server = http.createServer(app); // creating http server for wesocket with the builded app 
const wsServer = new WebSocketServer({ noServer: true }); // websocketServer
//const wsServer = new WebSocketServer({ server });

////////////////////Connection
httpServer.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

// WebSocket server 
httpServer.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, (ws) => {
        wsServer.emit('connection', ws, request);
    });
});
/////////////////Connetion WS
wsServer.on('connection', async (ws) => { // connecting from the websocket 
    ws.on('message', async (message) => { // assesing the message info passed by the front end app.js
        let msgObj;    //// try catch for the JSON.parse data from the messager
        try {
            msgObj = JSON.parse(message);
        } catch (e) {
            ws.send(JSON.stringify({ error: 'Invalid message format' }));
            return;
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////////////
        ////////////// Messages exchange 
        if (msgObj.type === 'login') {  // If the message is a loging message 
            const { username, pass } = msgObj;  // passing data to username and pass array

            // Connect to MongoDB
            const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true }); // modify to newst version
            try {
                await client.connect();   /// Conecing to the DB
                const db = client.db('MonsterMayhemUsers'); //  creating a connection to the DB name
                const users = db.collection('users'); // collection users to store the users of the Game

                // Find user by username
                const user = await users.findOne({ username }); // so if it finds a user mathching the data passed 

                if (user && user.password === pass) { // and the password is correct , user.password accesing DB // 
                    ws.send(JSON.stringify({ // SEND back the data by this we can say a user conection is accesed
                        username: username,
                        gamesPlayed: user.gamesPlayed,
                        gamesWon: user.gamesWon

                    }));
                } else {       // If no right user and password from DB
                    ws.send(JSON.stringify({ error: 'Invalid credentials' }));
                }
            } catch (error) {
                console.error('Error connecting to MongoDB:', error);
            } finally {
                await client.close();
            }
            /////////////////////////////////////Registration/////////////// If the message is to register 
        } else if (msgObj.type === 'register') {
            const { username, password } = msgObj;

            const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
            try {
                await client.connect();
                const db = client.db('MonsterMayhemUsers');
                const users = db.collection('users');

                const existingUser = await users.findOne({ username });      // similar to login but if user exist send error
                if (existingUser) {
                    ws.send(JSON.stringify({ error: 'Username already exists' }));
                } else {
                    await users.insertOne({ username, password, gamesPlayed: 0, gamesWon: 0 });  // insertOne to add data to the DB
                    ws.send(JSON.stringify({ success: 'User registered successfully' }));
                }
            } catch (error) {
                console.error('Error connecting to MongoDB:', error);
                ws.send(JSON.stringify({ error: 'Error registering user' }));
            } finally {
                await client.close();
            }
            /////////////////////////////Joining a game message///////////////////////////  After logged        
        } 
        else if (msgObj.type === 'joinGame') {
            const { username } = msgObj;

            if (!players.some(player => player.username === username)) {
                players.push({ username, ws });
            }
            shuffleArray(sides);
            const slidesTemp = [];
            slidesTemp.push(sides, ws);

            if (players.length >= 4) {
                const gamePlayers = players.slice(0, 4);
                players = players.slice(4);

                const playerUsernames = gamePlayers.map(player => player.username);



                let board = createEmptyBoard();

                let playerMonsters = gamePlayers.reduce((acc, player) => {
                    acc[player.username] = 0;
                    return acc;
                }, {});
                let playerEliminations = gamePlayers.reduce((acc, player) => {
                    acc[player.username] = 0;
                    return acc;
                }, {});

                // Sending game start message to all 4 players
                const firstPlayer =  determineFirstPlayer(playerMonsters, gamePlayers);
                let gameState = {
                    players: playerUsernames,
                    playerMonsters: playerMonsters,
                    playerEliminations: playerEliminations,
                    currentPlayer: firstPlayer,
                    currentTurn: 1,
                    board: board,
                   
                    playerSides: {
                        [playerUsernames[0]]: 'top',    // Player 1
                        [playerUsernames[1]]: 'bottom', // Player 2
                        [playerUsernames[2]]: 'left',   // Player 3
                        [playerUsernames[3]]: 'right'   // Player 4
                    },
                    playerMonsterPositions: gamePlayers.reduce((acc, player) => {
                        acc[player.username] = [];
                        return acc;
                    }, {})
                };
        
                // Sending game start message to all 4 players
                const promises = gamePlayers.map(player => player.ws.send(JSON.stringify({
                    ...gameState,
                    message: 'Game is starting!'
                })));
    
                await Promise.all(promises);
    

                handleTurn(gameState, gamePlayers);
             
            } else {
                const waitingPlayers = players.map(player => player.username);
                let side = ""; // Initialize the side variable
            
                if (waitingPlayers.length === 1) {
                    side = "Top";
                } else if (waitingPlayers.length === 2) {
                    side = "Bottom";
                } else if (waitingPlayers.length === 3) {
                    side = "Left";
                }else{side ="Right"};
                
                ws.send(JSON.stringify({
                    players: waitingPlayers,
                    message: 'Waiting for more players to join... Your side is: ' + side // Include the determined side in the message
               }));
               
            }

        }
    });
 ws.on('close', () => {
        players = players.filter(player => player.ws !== ws);
    });
});


// send signal to reg fro ejs to connect to the server 
app.get('/reg', (req, res) => {
    res.render('reg');
});
//////////////////////////////////////////////////////////////////////////////////////////////
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
function determineFirstPlayer(playerMonsters, gamePlayers) {
    const fewestMonsters = Math.min(...Object.values(playerMonsters));
    const candidates = gamePlayers.filter(player => playerMonsters[player.username] === fewestMonsters);
    let firstPlayer = candidates[Math.floor(Math.random() * candidates.length)].username;

    for (const player of gamePlayers) {
        player.ws.send(JSON.stringify({
            firstPlayer: firstPlayer,
            message: `${firstPlayer} goes first!`
        }));
    }

    return firstPlayer; // Return firstPlayer value for access outside the function
}
async function handleTurn(gameState, gamePlayers) {
    while (true) {
        const currentPlayer = gamePlayers.find(player => player.username === gameState.currentPlayer);

        // Initialize or reset actions at the start of the turn
        gameState.currentTurnActions = {
            moves: 0,
            placements: 0
        };

        // Wait for the current player to make a move or end the turn
        await new Promise(resolve => {
            currentPlayer.ws.on('message', (message) => {
                const msgObj = JSON.parse(message);

                if (msgObj.type === 'makeMove') {
                    const { action, monster, row, col, fromRow, fromCol, toRow, toCol } = msgObj;

                    if (action === 'place' && gameState.currentTurnActions.placements < 1) {
                        // Ensure the cell is empty before placing
                        if (gameState.board[row][col] === null) {
                            gameState.board[row][col] = monster;
                            gameState.playerMonsters[gameState.currentPlayer]++;
                            gameState.playerMonsterPositions[gameState.currentPlayer].push({ row, col, monster });
                            gameState.currentTurnActions.placements++;
                        }
                    } else if (action === 'move' && gameState.currentTurnActions.moves < gameState.playerMonsterPositions[gameState.currentPlayer].length) {
                        // Move the monster on the board
                        if (gameState.board[toRow][toCol] === null) {
                            gameState.board[fromRow][fromCol] = null;
                            gameState.board[toRow][toCol] = monster;

                            const monsterIndex = gameState.playerMonsterPositions[gameState.currentPlayer]
                                .findIndex(m => m.row === fromRow && m.col === fromCol);
                            if (monsterIndex > -1) {
                                gameState.playerMonsterPositions[gameState.currentPlayer][monsterIndex] = { row: toRow, col: toCol, monster };
                                gameState.currentTurnActions.moves++;
                            }
                        }
                    }

                    // Broadcast the updated game state
                    gamePlayers.forEach(player => player.ws.send(JSON.stringify({
                        ...gameState,
                        message: `${gameState.currentPlayer} ${action === 'place' ? 'placed' : 'moved'} a ${monster} ${action === 'place' ? `at ${String.fromCharCode(65 + col)}${row + 1}` : `from ${String.fromCharCode(65 + fromCol)}${fromRow + 1} to ${String.fromCharCode(65 + toCol)}${toRow + 1}`}`
                    })));
                } else if (msgObj.type === 'endTurn') {
                    // End the current turn
                    gameState.currentTurn++;
                    const nextPlayerIndex = (gameState.players.indexOf(gameState.currentPlayer) + 1) % gameState.players.length;
                    gameState.currentPlayer = gameState.players[nextPlayerIndex];

                    // Notify all players of the new current player
                    gamePlayers.forEach(player => player.ws.send(JSON.stringify({
                        currentPlayer: gameState.currentPlayer,
                        message: `It is now ${gameState.currentPlayer}'s turn`
                    })));

                    resolve(); // Proceed to the next turn
                }
            });
        });
    }
}


function createEmptyBoard() {
    const board = [];
    for (let row = 0; row < 10; row++) {
        board[row] = Array(10).fill(null);
    }
    return board;
}
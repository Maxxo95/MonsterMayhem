const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const path = require('path');
const { WebSocketServer } = require('ws');
const http = require('http');


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
const handleGame = require('./JSpartials/handleGame');// Import the handleGame function from handleGame.js

/// Variables
let gameState = {};
let viewCount = 0;
let players = [];
const board = [];
////////////////////////////////////////////////// Routes
app.get('/', (req, res) => {
    console.log('Welcome Visitor');
    
    res.render('index', {viewCount});
});
// send signal to reg fro ejs to connect to the server 
app.get('/reg', (req, res) => {
    res.render('reg');
});
//////////////////////  Sockets 
const server = http.createServer(app); // creating http server for wesocket with the builded app 
const wsServer = new WebSocketServer({ noServer: true }); // websocketServer


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
            const { username } = msgObj;                // Get the username from the message

            if (!players.some(player => player.username === username)) { // Check if the player is already in the game
                players.push({ username, ws }); // Add the player 
            }
          
            if (players.length >= 4) { 
                const gamePlayers = players.slice(0, 4);
                players = players.slice(4);

           /// Variables for the game and the players 
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
                const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true }); // Add one gamed played to all players
                try {                                                                          
                    await client.connect();
                    const db = client.db('MonsterMayhemUsers');
                    const users = db.collection('users');

                    // Increment gamesPlayed for all players
                    await Promise.all(playerUsernames.map(username =>        
                        users.updateOne(
                            { username: username },
                            { $inc: { gamesPlayed: 1 } }
                        )
                    ));
                } catch (error) {
                    console.error('Error connecting to MongoDB:', error);
                } finally {
                    await client.close();
                }    
                    // Sending game start message to all 4 players
                    const firstPlayer = determineFirstPlayer(playerMonsters, gamePlayers);
                    let gameState = {                             // Game state , this will keep alll the info of the game played on the back end 
                        players: playerUsernames,
                        playerMonsters: playerMonsters,
                        playerEliminations: playerEliminations,
                        currentPlayer: firstPlayer,
                        currentTurn: 1,
                        board: board,
                        winner: "",
                        playerSides: {
                            [playerUsernames[0]]: 'top',    // Player 1
                            [playerUsernames[1]]: 'bottom', // Player 2
                            [playerUsernames[2]]: 'left',   // Player 3
                            [playerUsernames[3]]: 'right'   // Player 4
                        },
                        playerMonsterPositions: gamePlayers.reduce((acc, player) => { // Not at the moment but when the game start , monster position have to be stored 
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

                    handleGame(gameState, gamePlayers,viewCount);     // With all the variables and the game state the handleGame function deploy the game 
              
            } else {     // If there are not enough players to start the game 
                const waitingPlayers = players.map(player => player.username);
                let side = ""; // Initialize the side variable

                if (waitingPlayers.length === 1) {
                    side = "Top";
                } else if (waitingPlayers.length === 2) {
                    side = "Bottom";
                } else if (waitingPlayers.length === 3) {
                    side = "Left";
                } else { side = "Right" };

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



//////////////////////////////////////////////////////////////////////////////////////////////

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


function createEmptyBoard() {
    const board = [];
    for (let row = 0; row < 10; row++) {
        board[row] = Array(10).fill(null);
    }
    return board;
}
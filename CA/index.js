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
const board = [];
////////////////////////////////////////////////// Routes
app.get('/', (req, res) => {
    console.log('Welcome Visitor');
    
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
                const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
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
                    // Sending game start message to all 4 players
                    const firstPlayer = determineFirstPlayer(playerMonsters, gamePlayers);
                    let gameState = {
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
                } catch (error) {
                    console.error('Error connecting to MongoDB:', error);
                } finally {
                    await client.close();
                }
            } else {
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
    let winner = "";
    while (winner === "") {
        const currentPlayer = gamePlayers.find(player => player.username === gameState.currentPlayer);

        // Initialize or reset actions at the start of the turn
        gameState.currentTurnActions = {
            moves: 0,
            placements: 0
        };

        await new Promise(resolve => {
            const messageHandler = async (message) => {
                const msgObj = JSON.parse(message);

                if (msgObj.username !== gameState.currentPlayer) {
                    return;
                }

                if (msgObj.type === 'makeMove') {
                    const { action, monster, row, col, fromRow, fromCol, toRow, toCol } = msgObj;
                    console.log(`Received move: ${JSON.stringify(msgObj)}`); // Debug log

                    if (action === 'place' && gameState.currentTurnActions.placements < 1) {
                        if (gameState.board[row][col] === null) {
                            console.log(`Placing ${monster} at (${row}, ${col})`); // Debug log
                            gameState.board[row][col] = monster;
                            gameState.playerMonsters[gameState.currentPlayer]++;
                            gameState.playerMonsterPositions[gameState.currentPlayer].push({ row, col, monster });
                            gameState.currentTurnActions.placements++;
                            console.log(`Placement successful. Current placements: ${gameState.currentTurnActions.placements}`); // Debug log
                        } else {
                            console.log(`Failed to place ${monster} at (${row}, ${col}): Cell is occupied`); // Debug log
                            currentPlayer.ws.send(JSON.stringify({
                                message: `Invalid placement: Cell ${String.fromCharCode(65 + col)}${row + 1} is already occupied.`
                            }));
                        }
                    } else if (action === 'move' && gameState.currentTurnActions.moves < gameState.playerMonsterPositions[gameState.currentPlayer].length) {
                        const destinationMonster = gameState.board[toRow][toCol];
                        if (destinationMonster === null) {
                            console.log(`Moving ${monster} from (${fromRow}, ${fromCol}) to (${toRow}, ${toCol})`); // Debug log
                            gameState.board[fromRow][fromCol] = null;
                            gameState.board[toRow][toCol] = monster;

                            const monsterIndex = gameState.playerMonsterPositions[gameState.currentPlayer]
                                .findIndex(m => m.row === fromRow && m.col === fromCol && m.monster === monster);
                            if (monsterIndex > -1) {
                                gameState.playerMonsterPositions[gameState.currentPlayer][monsterIndex] = { row: toRow, col: toCol, monster };
                                gameState.currentTurnActions.moves++;
                                console.log(`Move successful. Current moves: ${gameState.currentTurnActions.moves}`); // Debug log
                            }
                        } else if (destinationMonster && !destinationMonster.startsWith(currentPlayer.username[0])) {
                            console.log(`Initiating battle: ${monster} vs ${destinationMonster} at (${toRow}, ${toCol})`); // Debug log

                            const playerMonsters = gameState.playerMonsters[currentPlayer.username];
                            const playerEliminations = gameState.playerEliminations[currentPlayer.username];

                            handleBattle(gameState, currentPlayer, gamePlayers, {
                                row: toRow,
                                col: toCol,
                                opponentMonster: destinationMonster,
                                playerMonster: monster,
                                fromRow: fromRow,
                                fromCol: fromCol,
                                playerMonsters: playerMonsters,
                                playerEliminations: playerEliminations
                            });

                            const eliminatedPlayers = Object.entries(gameState.playerEliminations).filter(([username, count]) => count >= 1);
                            eliminatedPlayers.forEach(([username]) => {
                                console.log(`${username} has been eliminated from the game.`);
                                gameState.players = gameState.players.filter(player => player !== username);
                                gamePlayers = gamePlayers.filter(player => player.username !== username);

                                // Notify all players about the elimination
                                gamePlayers.forEach(player => player.ws.send(JSON.stringify({
                                    ...gameState,
                                    message: `${username} has been eliminated from the game.`
                                })));
                            });

                            if (gameState.players.length === 1) {
                                winner = gameState.players[0];
                                console.log(`${winner} has won the game!`);
                                const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true }); // modify to newst version
                                viewCount += 1;
                                try {
                                    await client.connect();
                                    const db = client.db('MonsterMayhemUsers');
                                    const users = db.collection('users');

                                    await users.updateOne(
                                        { username: winner },
                                        { $inc: { gamesWon: 1 } }
                                    )
                                }
                                catch (error) {
                                    console.error('Error connecting to MongoDB:', error);
                                } finally {
                                    await client.close();
                                }
                                // Notify all players about the winner
                                gamePlayers.forEach(player => player.ws.send(JSON.stringify({
                                    ...gameState,
                                    message: `${winner} has won the game!`
                                })));

                                return winner; // End the game
                            }
                        }

                        else {
                            console.log(`Failed to move ${monster} to (${toRow}, ${toCol}): Cell is occupied by own monster`); // Debug log
                            currentPlayer.ws.send(JSON.stringify({
                                message: `Invalid move: Destination cell ${String.fromCharCode(65 + toCol)}${toRow + 1} is already occupied by your own monster.`
                            }));
                        }
                    }

                    // Broadcast the updated game state
                    gamePlayers.forEach(player => player.ws.send(JSON.stringify({
                        ...gameState,
                        message: `${gameState.currentPlayer} ${action === 'place' ? 'placed' : 'moved'} a ${monster} ${action === 'place' ? `at ${String.fromCharCode(65 + col)}${row + 1}` : `from ${String.fromCharCode(65 + fromCol)}${fromRow + 1} to ${String.fromCharCode(65 + toCol)}${toRow + 1}`}`
                    })));
                } else if (msgObj.type === 'endTurn' && msgObj.username === gameState.currentPlayer) {
                    console.log(`Ending turn for player: ${gameState.currentPlayer}`); // Debug log

                    gameState.currentTurn++;
                    const nextPlayerIndex = (gameState.players.indexOf(gameState.currentPlayer) + 1) % gameState.players.length;
                    gameState.currentPlayer = gameState.players[nextPlayerIndex];

                    // Notify all players of the new current player
                    gamePlayers.forEach(player => player.ws.send(JSON.stringify({
                        currentPlayer: gameState.currentPlayer,
                        message: `It is now ${gameState.currentPlayer}'s turn`
                    })));

                    currentPlayer.ws.off('message', messageHandler); // Remove the message listener
                    resolve(); // Proceed to the next turn
                }
            };

            currentPlayer.ws.on('message', messageHandler);
        });
    }
}

async function handleBattle(gameState, currentPlayer, gamePlayers, {
    row: toRow,
    col: toCol,
    opponentMonster: destinationMonster,
    playerMonster,
    fromRow,
    fromCol,
    playerMonsters,
    playerEliminations
}) {

    if (!playerMonster || !destinationMonster) {
        console.log('Error: Missing monsters for battle');
        return;
    }
    // Extract playerType and opponentType using lastIndexOf method
    const playerType = playerMonster.split('.')[1];
    const opponentType = destinationMonster.split('.')[1];
    const oponent = destinationMonster.split('.')[0];
    const username = playerMonster.split('.')[0];
    // Log the extracted monster types for debugging
    console.log(`Player Type: ${playerType}, Opponent Type: ${opponentType}`);

    // Perform battle based on the extracted monster types

    // Perform battle based on the extracted monster types
    if ((playerType === 'Vampire' && opponentType === 'Werewolf') ||
        (playerType === 'Werewolf' && opponentType === 'Ghost') ||
        (playerType === 'Ghost' && opponentType === 'Vampire')) {
        // Opponent's monster is removed
        console.log(`${destinationMonster} defeated by ${playerMonster}`);
        gameState.board[toRow][toCol] = playerMonster;
        gameState.board[fromRow][fromCol] = null;
        gameState.playerEliminations[oponent]++;
        gameState.playerMonsters[oponent]--;
    } else if ((opponentType === 'Vampire' && playerType === 'Werewolf') ||
        (opponentType === 'Werewolf' && playerType === 'Ghost') ||
        (opponentType === 'Ghost' && playerType === 'Vampire')) {
        // Player's monster is removed
        console.log(`${playerMonster} defeated by ${destinationMonster}`);
        gameState.board[fromRow][fromCol] = null;
        gameState.playerEliminations[username]++;
        gameState.playerMonsters[username]--;
    } else if (playerType === opponentType) {
        // Both monsters are removed
        console.log(`${playerMonster} and ${destinationMonster} destroy each other`);
        gameState.board[toRow][toCol] = null;
        gameState.board[fromRow][fromCol] = null;
        gameState.playerEliminations[username]++;
        gameState.playerMonsters[username]--;
        gameState.playerEliminations[oponent]++;
        gameState.playerMonsters[oponent]--;
    } else {
        console.log('Battle inconclusive');
    }
    // Notify players about the battle outcome
    gamePlayers.forEach(player => player.ws.send(JSON.stringify({
        ...gameState,
        message: `Battle occurred at ${String.fromCharCode(65 + toCol)}${toRow + 1}`
    })));

}






function createEmptyBoard() {
    const board = [];
    for (let row = 0; row < 10; row++) {
        board[row] = Array(10).fill(null);
    }
    return board;
}
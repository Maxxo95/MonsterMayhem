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
let viewCount = 0;
let players = [];
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
//////////////////Login authentication
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
        }else if (msgObj.type === 'joinGame') {// 
            const { username } = msgObj;  
            if (!players.some(player => player.username === username)) {
                players.push({ username, ws });// adding the user to the players list
            }
        
            if (players.length >= 4) {// if players reach the number required create a new group, if more a group should be full and passed for game
                const gamePlayers = players.slice(0, 4); // helper array to manage data
                players = players.slice(4); // Remove these players from the queue
        
                const playerUsernames = gamePlayers.map(player => player.username);//map of players in the game
        
                for (const player of gamePlayers) {// for the each player on gamePlayers, 
                    player.ws.send(JSON.stringify({
                        players: playerUsernames, // list of names of players  
                        message: 'Game is starting!' // 
                    }));
                }
            } else {// else if the group is less than 4 
const waitingPlayers = players.map(player => player.username);// Pass this variable out the function for develop game?
                ws.send(JSON.stringify({
                    players: waitingPlayers,
                    message: 'Waiting for more players to join...'
                }));
            }
        }
        });
        // if a player leave 
        ws.on('close', () => {
        players = players.filter(player => player.ws !== ws);
        });
        });
        

// send signal to reg fro ejs to connect to the server 
app.get('/reg', (req, res) => {
    res.render('reg');
});
//////////////////////////////////////////////////////////////////////////////////////////////

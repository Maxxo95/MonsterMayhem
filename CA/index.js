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

const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';

// Variables
let viewCount = 0;
let TestPosts = [
    { title: 'Title', text: 'BlaBlablablabla' },
    { title: 'two', text: 'BlaBlablablabla' }
];
let Users = [
    { username: 'Max', pass: 'pass1234' },
    { username: 'Sam', pass: 'pass1234' }
];

////////////////////////////////////////////////// Routes
app.get('/', (req, res) => {
    console.log('Welcome Visitor');
    viewCount += 1;
    res.render('index', { viewCount });
});

const server = http.createServer(app);
const wsServer = new WebSocketServer({ noServer: true });
//const wsServer = new WebSocketServer({ server });

httpServer.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

// WebSocket server
httpServer.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, (ws) => {
        wsServer.emit('connection', ws, request);
    });
});
wsServer.on('connection', async (ws) => {
    ws.on('message', async (message) => {
        let msgObj;
        try {
            msgObj = JSON.parse(message);
        } catch (e) {
            ws.send(JSON.stringify({ error: 'Invalid message format' }));
            return;
        }

        if (msgObj.type === 'login') {
            const { username, pass } = msgObj;

            // Connect to MongoDB
            const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
            try {
                await client.connect();
                const db = client.db('MonsterMayhemUsers');
                const usersCollection = db.collection('users');

                // Find user by username
                const user = await usersCollection.findOne({ username });

                if (user && user.password === pass) {
                    ws.send(JSON.stringify({ message: `Username - ${username}\nGames Played - ${user.gamesPlayed}\nGames Won - ${user.gamesWon}`,
                    username  }));
                } else {
                    ws.send(JSON.stringify({ error: 'Invalid credentials' }));
                }
            } catch (error) {
                console.error('Error connecting to MongoDB:', error);
            } finally {
                await client.close();
            }
        }
    });
});
//////////////////////


///////////////////////////////////////////////
app.get('/game', (req, res) => {
    res.render('game', { TestPosts });
});
app.post('/new-post', (req, res) => {// writting on the testpost list
    TestPosts.push({ title: req.body.title, text: req.body.text });
    res.redirect('/game');
});


/*async function connectToMongoDB() {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


    try {
        await client.connect();
        console.log('Connected to MongoDB successfully!');


        const db = client.db('MonsterMayhemUsers'); // Use your database name


        // Create the 'users' collection
        const usersCollection = db.collection('users');


        // Insert a sample user document
        await usersCollection.insertOne({
            username: 'Shelly',
            password: 'ratito',
            gamesPlayed: 0,
            gamesWon: 0
        });
        const foundUser = await usersCollection.findOne({ username: 'Shelly' });
      console.log('Found user:', foundUser);


       console.log('User data inserted successfully!');




    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    } finally {
        await client.close();
    }
}


connectToMongoDB();


*/ 




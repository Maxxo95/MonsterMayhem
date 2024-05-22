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

wsServer.on('connection', (ws) => {
    ws.on('message', (message) => {
        let msgObj;
        try {
            msgObj = JSON.parse(message);
        } catch (e) {
            ws.send(JSON.stringify({ error: 'Invalid message format' }));
            return;
        }

        if (msgObj.type === 'login') {
            const { username, pass } = msgObj;
            const user = Users.find(u => u.username === username && u.pass === pass);

            if (user) {
                ws.send(JSON.stringify({ message: `Username - ${username} - Succesfull Login`, username }));
            } else {
                ws.send(JSON.stringify({ error: 'Invalid credentials' }));
            }
        }
    });
});


///////////////////////////////////////////////
app.get('/game', (req, res) => {
    res.render('game', { TestPosts });
});
app.post('/new-post', (req, res) => {// writting on the testpost list
    TestPosts.push({ title: req.body.title, text: req.body.text });
    res.redirect('/game');
});


// Start server
httpServer.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

// WebSocket server
httpServer.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, (ws) => {
        wsServer.emit('connection', ws, request);
    });
});

wsServer.on('connection', (ws) => {
    ws.on('message', (message) => {
        console.log(message);
    });
});

/*
// Socket.IO server
const io = require('socket.io')(httpServer, {
    cors: { origin: "*" }
});

io.on('connection', (socket2) => {
    console.log('a user connected');

    socket2.on('message', (message) => {
        console.log(message);
        io.emit('message', `${ws.id.substr(0, 2)} said ${message}`);
    });
});


app.get('/parsing/:display', (req, res) => {
    res.send(req.params.display);
});

app.get('/rest', (req, res) => {
    res.send(`The number is: ${req.query.number} and the text is: ${req.query.text}`);
});
*/
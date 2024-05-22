const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const path = require('path');
const { WebSocketServer } = require("ws");

//specify port comand line
///////////////////////////////////////////WEBSOCKETS INTRODUCE 
const WebSocket = require('ws')
//const server = new WebSocket.Server( {port : '2000'})
////////////////////////////////////////// web build
const PORT = (process.argv[2] || 3000);
app = express()
app.use(bodyParser.urlencoded({ extended: true}));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, '.')));
///////////////////////////////////////variables
let viewCount = 0; // count of page views
let TestPosts =[
    { title: "Title", text: "BlaBlablablabla"},
    { title: "two", text: "BlaBlablablabla"}
]
////////////////////////////////////////
//////////////////////////////////////////// Index mapping , get
app.get ("/", (req,res) => {       
console.log("New visitor");
//console.log(req);
viewCount += 1;
res.render("index.ejs" , {viewCount});
});


/////////////////////EXample  %blabla&%bla  
app.get("/parsing/:display", (req, res) => {
res.send(req.params.display);
});
////////////////////////Example  
app.get("/rest", (req,res)=> { // rest?text=Testing&number=100
    res.send(`The number is: ${req.query.number} and the text is: ${req.query.text}`);
});


//// on another ejs file passing data to  game
app.get("/game", (req,res) => {
    res.render("game", { TestPosts}); //from testpost previously created 
});
//Form index  user information    get info from index form
app.post("/userInfo", (req,res)=> {
    res.send(`Hello - ${req.body.username} , Info -age -${req.body.age}`);
});

app.post("/new-post", (req,res) => {
TestPosts.push({ title: req.body.title, text: req.body.text})// push on the list
res.redirect("/game");// use the previous creathed method 
});

const httpServer = app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
/*
server.on('connection', socket =>{
    socket.on('message', message => {
        socket.send(` Recived, CCT test ${message}`)
    })
})*/

const wsServer = new WebSocket.Server({ noServer : true })
httpServer.on('upgrade', (request, socket, head)=> {
    wsServer.handleUpgrade(request, socket, head, (ws)=>{
        wsServer.emit('connection', ws, request);
    });
});

wsServer.on('connection', (ws) =>{
    ws.on('message', message => {
        console.log(message);
    })
})
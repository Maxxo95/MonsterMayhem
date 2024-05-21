const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const PORT = 3000;
app = express()
app.use(bodyParser.urlencoded({ extended: true}));
app.set("view engine", "ejs");

let viewCount = 0;

////////////////////////////////////////
app.get ("/", (req,res) => {
console.log("New visitor");
console.log(req);
viewCount += 1;
res.render("index.ejs" , {viewCount});
});

app.get ("/hello", (req,res) => {
    console.log("New visitor");
    res.send("<h1>Hello!</h1>");
    });


app.get("/parsing/:display", (req, res) => {
res.send(req.params.display);
});

app.get("/rest", (req,res)=> {
    res.send(`The number is: ${req.query.number} and the text is: ${req.query.text}`);
});

app.post("/userInfo", (req,res)=> {
    res.send(`Hello - ${req.body.username} , Info -age -${req.body.age}`);
});
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
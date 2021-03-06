var bodyParser = require("body-parser");
const express = require("express"); //express framework to have a higher level of methods
const app = express(); //assign app variable the express class/method
var http = require("http");
var path = require("path");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const server = http.createServer(app); //create a server

require("dns").lookup(require("os").hostname(), function (err, add, fam) {
  console.log("addr: " + add);
});

const WebSocket = require("ws");
const s = new WebSocket.Server({ server });

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname + "/index.html"));
});

s.on("connection", function (ws, req) {

  ws.on("message", function (message) {
    console.log("Received: " + message);
    s.clients.forEach(function (client) {
      //broadcast incoming message to all clients (s.clients)
      if (client != ws && client.readyState) {
        //except to the same client (ws) that sent this message
        client.send(message);
      }
    });
  });

  ws.on("close", function () {
    console.log("lost one client");
  });

  console.log("new client connected");
});

server.listen(3000);

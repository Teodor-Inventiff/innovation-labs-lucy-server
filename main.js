const { port } = require('./options.json'); // options about the server

const app = require('express')(); // boilerplate
const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: {
    origin: '*',
  }
});

app.get('/', (req, res) => { // http request redirects here
  console.log('a http request');
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => { // a new socket connection opened
  console.log('a user connected');

  socket.on('write-buffer', (msg) => { // received a buffor of data from ESP
    console.log('received a buffer');
    console.log(`received ${JSON.stringify(msg)}`);
  });

  socket.on('read-buffer', (msg) => {
    console.log('got a buffer');
    console.log(msg);
    io.emit('receive-buffer', 'val');
  });

  socket.on('disconnect', () => { // a socket connection got closed
    console.log('user disconnected');
  });
});

http.listen(port, () => { // init notifiier
  console.log(`listening on localhost:${port}`);
});

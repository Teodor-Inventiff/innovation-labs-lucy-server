const { port } = require('./options.json'); // options about the server

const app = require('express')(); // boilerplate
const http = require('http').Server(app);
const io = require('socket.io')('http://localhost');

// var socket = io();
// socket.emit('get-buffer', 'val');
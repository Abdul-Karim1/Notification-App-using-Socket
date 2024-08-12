var express = require('express');
var app = express();
var mongoose = require('mongoose')
var http = require('http').Server(app);

// Require the path module
var path = require('path');
const { CLIENT_RENEG_LIMIT } = require('tls');

mongoose.connect('mongodb://host.docker.internal:27017/Destinations').then(()=>{
    console.log('Connected to Mongodb');
}).catch((err) =>{
    console.log(err)
})

// Correctly initialize Socket.io with the HTTP server
var io = require('socket.io')(http);

app.get('/', function(req, res) {
    var options = {
        root: path.join(__dirname)
    }
    var filename = 'index.html';
    res.sendFile(filename, options);
});

var roomno = 1;
var full = 0;
io.on('connection', function(socket){
    console.log('A User Connected');
    socket.join('room-'+roomno);
    io.sockets.in('room-'+roomno).emit("connectedRoom",'You are connected to room no.'+roomno);

    full++;
    if(full >= 2){
        full=0;
        roomno++
    }
    socket.on('disconnect',function(){
        console.log('A user disconnected')
    });

});
// var csnp = io.of('/custom-namespace')
// csnp.on('connection', function(socket){
//     console.log('A user connected')
//     csnp.emit('custom-event', 'Tester Event Call')

//     socket.on('disconnect', function(){
//         console.log('A user Disconnected')
//     })
// })

// var users = 0;
// // Attach the connection event listener to the Socket.io instance
// io.on('connection', function(socket) {
//     console.log('A user connected');
//     users++
//     socket.emit('newUserConnect',{message: 'Welcome you are the first one to connect'})
//     socket.broadcast.emit('newUserConnect',{message: users + ' Users Connected'})
//     io.sockets.emit('broadcast', {message: users + 'users connected!'})
//     // setTimeout(function(){
//     //     socket.emit('myCustomEvent', {description: 'Sent message from server side by server side custom events'});
//     // },3000)

    // Listen for the disconnect event
//     socket.on('disconnect', function() {
//         users--;
//         io.sockets.emit('broadcast', {message: users + 'users connected!'})
//     });
// });

//Watch for changes in the destinations collection
const destinationCollection = mongoose.connection.collection('Destinations');
const changeStream = destinationCollection.watch();

changeStream.on('change', (change) => {
  console.log('Change detected:', change);

  if (change.operationType === 'insert') {
    const newDestination = change.fullDocument;
    io.emit('newDestination', newDestination);
  }
});

// Start the server and listen on port 3000
http.listen(3000, function() {
    console.log('Server ready on port 3000');
});

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);



io.on('connection', function(socket){									
		
		io.emit('id', socket.id);
		
		console.log('client connected!');
		
		
});

app.use(express.static(__dirname+"/../client/"));

http.listen(3002,function(){
		console.log('listening!');
});

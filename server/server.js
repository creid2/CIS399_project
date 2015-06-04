var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose'); // May need to change this


io.on('connection', function(socket){									
		io.emit('id', socket.id);
		console.log('client connected!');
});

app.use(express.static(__dirname+"/../client/"));

http.listen(3002,function(){
		console.log('listening!');
});

// Temporarily using mongoose: this may change to nedb
mongoose.connect("mongodb://localhost/bingodatabase");

// This is basically boilerplate, we can put things in here if we want
// to have various effects on connect/disconnect, or database error.
// For now, it just console.logs the existence of the event.
mongoose.connection.on('connected', function() {
  console.log("Connected to Mongoose.");
  console.log("Adding a random math question...");
  randomQuestion();
});

mongoose.connection.on('error',function (err) {
     console.log('Mongoose connection error: ' + err);
});

mongoose.connection.on('disconnected', function () {
     console.log('Mongoose disconnected');
});

var UserSchema = mongoose.Schema(
        {'username'   : String,
         'image'      : String,
         'passhash'   : String,
         'salt'       : String, // very optimistic :)
         'permissions': Number,
         'points'     : Number
        });

var QuestionSchema = mongoose.Schema(
        {'question' : String,
         'answer'   : String,
         'q_set'    : String
        });

var User = mongoose.model("User", UserSchema);
var Question = mongoose.model("Question", QuestionSchema);

function randomQuestion() {
  // Insert a single record into the database, as an example. This will run
  // every time node starts up, so it will populate the database over time.
  // This uses a random math question, so as to provide some variety.

  // Get two random numbers from 0 to 9. 
  var x = Math.floor(Math.random() * 10);
  var y = Math.floor(Math.random() * 10);
  var ans = x + y; // add them

  // Make strings for the question and answer
  var q = x.toString() + " + " + y.toString();
  var a = (x + y).toString();

  // This try...catch block is because I was getting weird errors.
  try {
    var newQuestion = new Question({'question': q, 'answer': a, 'q_set':'addition'});
    // Save, and console log the result of saving
    newQuestion.save(function (err, doc){ 
        console.log( "New question result"
             + JSON.stringify( err ) + " & " + JSON.stringify( doc));
    });
  } catch(e) {
    console.log("Error trying to instantitate new question:");
    console.log(e);
  }

}


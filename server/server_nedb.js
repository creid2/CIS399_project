var express = require('express');
var app = express();
var http = require('http').Server(app); 
var io = require('socket.io')(http, { pingTimeout: 60000}); // ping timeout doens't work?

// Using nedb so we can put this on ix--the mongo instructions didn't work for me
var Datastore = require('nedb'),
    db = new Datastore({filename: './questions_nedb', autoload:true});

// This didn't work, we wound up randomly guessing a port
//var port = process.env.PORT || 3000; 
db.loadDatabase();

// Regular global variables:
var questionsLeft = []; // Keeps track of questions in the set
var QUESTION_TIME = 5000; // Delay in milliseconds between questions
var MAX_PLAYERS = 5;      // Number of players for each game
//var playing = false;
var numConnected = 0;
var playerNum = 1;
var questionTimer;


io.on('connection', function(socket){									
    numConnected++;
    console.log(numConnected, "players connected");

    io.emit('id');
    console.log('client connected with socket id', socket.id);

    // Send some random questions over to the client that just connected
    getAnswerGrid('addition', socket.id);
    socket.on('idUpdate',function(msg){
        console.log('idUpdate recieved from player '+ msg.split(':')[0]);
        io.emit('idUpdate', msg);
    });

    socket.on('inGame',function(idNum){
        if (idNum==0){
            io.emit("inGame", playerNum);
            playerNum+=1;
        };
    });

    socket.on('claimVictory', function(msg) {
        console.log("User", msg.id, "won with", msg.correct, "points.");
        io.emit('userWon', msg);
        initGame('addition');
        getAnswerGrid('addition', socket.id);
        //playing = false;
    });

    // Doesn't seem to work, but not a priority to figure out why.
    io.on('disconnect', function(socket){
        console.log("A socket disconnected");
        numConnected--;
        playerNum = 0;
    });
    
    // UNUSED: Every 5 connections, make a new room
    if (playerNum === MAX_PLAYERS) {
        initGame('addition');
    }

    socket.on("reset", function(msg) {
        // No message is currently being passed, but might want to have one
        // someday
        getAnswerGrid('addition', socket.id);
        resetGame('addition');
    });

    socket.on('getNewBoard', function(msg) {
        getAnswerGrid('addition', socket.id);
    });
});



app.use(express.static(__dirname+"/../client/"));

// On ix, we guessed port 7890 which works. On localhost, 3000 works.
http.listen(3000, function(err) {  
	console.log('listening! err=', err);
});

// We don't use mongoose, but this schema is useful for seeing how the databse
// is laid out:
/*
var QuestionSchema = mongoose.Schema(
        {'question' : String,
         'answer'   : String,
         'q_set'    : String
        });
*/

function randomQuestion() {
    // Insert a single record into the database, as an example. This will run
    // every time node starts up, so it will populate the database over time.
    // This uses a random math question, so as to provide some variety.
    // Returns:
    //     Nothing

    // Get two random numbers from 0 to 9. 
    var x = Math.floor(Math.random() * 10);
    var y = Math.floor(Math.random() * 10);
    var ans = x + y; // add them

    // Make strings for the question and answer
    var q = x.toString() + " + " + y.toString();
    var a = (x + y).toString();

    var newQuestion = {question:q, answer:a, q_set:'addition'};
    // Save, and console log the result of saving
    db.insert(newQuestion, function(err, doc) {
    //newQuestion.insert(function (err, doc){ 
        console.log( "New question result: err=" + 
             JSON.stringify( err ) + " & result=" + JSON.stringify( doc));
    });
}
// Adds one random question every time server starts up. Optional: On first
// startup, throw a quick for loop around this to populate new databse.
randomQuestion(); 

function getAnswerGrid(qSet, socket) {
    // Creates a random 5x5 array of answers from the given question set. If
    // the question set does not have enough questions in it to fill a 5x5 
    // array, "Insufficient questions in set" will be appended to fill out the
    // extra space.
    // Returns:
    //      Nothing
    // Effects:
    //      Emits a 5x5 grid to given socket

    // Note: Mongo (and endb) have no native equivalent to SQL's ORDER BY RAND()

    db.find({q_set:qSet}, function(err, res) {
        if (err) {
            console.log("Error:", err);
        } else {
            //console.log("Returned:\n", res);
            var num = 0;
            res.forEach(function getQuestion(cur) {
                num++;
            });

            // Randomize the order of the array, Thanks to:
            // http://jsfromhell.com/array/shuffle
            for(var j, x, i = res.length; i; j = parseInt(Math.random() * i), x = res[--i], res[i] = res[j], res[j] = x);
            // Now take the first 25 elements
            if (res.length > 25) {
                res = res.slice(0, 25);
            } else {
                while (res.length < 25) {
                    res.push( {"question": "Insufficient questions",
                                "answer" : "Insufficient questions"});
                }
            }
            io.to(socket).emit("randomBoard", res);
        }
    });
}

function initGame(qSet) {
    console.log("new Game");
    questionsLeft = [ ];
    clearTimeout(questionTimer); // Stop any existing newQuestion loop

    // Look at all questions in the database
    db.find({q_set:qSet}, function(err, res) {
        if (err) {
            console.log("Error in initGame:", err);
            questionsLeft.push("Error getting a question");
        } else {
            // Randomly shuffle the array
            for(var j, x, i = res.length; i; j = parseInt(Math.random() * i), x = res[--i], res[i] = res[j], res[j] = x);
            questionsLeft = res;
            console.log("Assigned new questions");
            nextQuestion();
        }
    });
    console.log("initGame called");
}

function nextQuestion() {
    questionsLeft.pop();

    // If there are remaining questions, serve up the next one
    if (questionsLeft.length > 0) {
        io.emit("newQuestion", questionsLeft[questionsLeft.length - 1]);
        questionTimer = setTimeout(function(){nextQuestion()}, QUESTION_TIME); 
    } else {
        // If we've run out of questions, start again
        console.log("Out of questions");
        initGame('addition'); 
    }
}

function resetGame(qSet) {
    /* Resets the gameboard for all clients in the room, and refreshes the 
     * question set.
     */
    clearTimeout(questionTimer); // Stop any existing newQuestion loop
    //if (playing)
    console.log("Resetting game");
    //questionsLeft = [];  // Reset questions left
    io.emit('resetScores', { }); // Sets scores to zero
    initGame('addition');      // Fill out the question set again
}


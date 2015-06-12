var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose'); // May need to change this

var questionsLeft = []; // Keeps track of questions in the set

var connectedClients = []; 
 playerNum =1;


io.on('connection', function(socket){									
    //io.emit('id', socket.id);
    io.emit('id');
    connectedClients.push(socket.id);
    console.log('client connected with socket id', socket.id);

    // Send some random questions over to the client that just connected
    // Not sure why this doesn't work.
    getAnswerGrid('addition', socket.id);
    //broadcastQuestion();
    socket.on('idUpdate',function(msg){

        console.log('idUpdate recieved from player '+ msg.split(':')[0]);
        io.emit('idUpdate', msg);
    });

    socket.on('inGame',function(idNum){
        if (idNum==0){
            io.emit("inGame", playerNum);
            playerNum+=1;
            if(playerNum>5){
                playerNum =1;
            };
        };
    });

});

// Doesn't seem to work, but probably not a priority to figure out why.
io.on('disconnect', function(socket){
    console.log("client id", socket.id, "disconnected");
    var i = connectedClients.indexOf(socket.id);
    connectedClients.splice(i, 1); // remove the specified socket id
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
    initGame('addition');
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
    // Returns:
    //     Nothing

    // Get two random numbers from 0 to 9. 
    var x = Math.floor(Math.random() * 10);
    var y = Math.floor(Math.random() * 10);
    var ans = x + y; // add them

    // Make strings for the question and answer
    var q = x.toString() + " + " + y.toString();
    var a = (x + y).toString();

    var newQuestion = new Question({'question':q, 'answer':a, 'q_set':'addition'});
    // Save, and console log the result of saving
    newQuestion.save(function (err, doc){ 
        console.log( "New question result: err=" + 
             JSON.stringify( err ) + " & result=" + JSON.stringify( doc));
    });
}

function getAnswerGrid(qSet, socket) {
    // Returns a random 5x5 array of answers from the given question set. If
    // the question set does not have enough questions in it to fill a 5x5 
    // array, "Insufficient questions in set" will be appended to fill out the
    // extra space.
    // Returns:
    //      5x5 array of strings

    // Note: Mongo has no native equivalent to SQL's ORDER BY RAND()

    // Searches for everything matching qSet, only selecting 'question' and 
    // 'answer' fields (although _id is automatically included)
    var ans = Question.find({'q_set':qSet}, 'question answer', function(err, res) {

        if (err) {
            console.log("Error:", err);
        } else {
            //console.log("Returned:\n", res);
            var num = 0;
            res.forEach(function getQuestion(cur) {
                //console.log("Question:", cur.question, "\tAnswer:", cur.answer);
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
    //console.log("Logging variable 'ans':\n", ans);
}

function initGame(qSet) {
    console.log("new Game");
    Question.find({'q_set':qSet}, 'question answer', function(err, res) {
        if (err) {
            console.log("Error in initGame:", err);
            questionsLeft.push("Error getting a question");
        } else {
            // Randomly shuffle the array
            for(var j, x, i = res.length; i; j = parseInt(Math.random() * i), x = res[--i], res[i] = res[j], res[j] = x);
            questionsLeft = res;
            nextQuestion();
        }
    });
}

function nextQuestion() {
    questionsLeft.pop();

    // If there are remaining questions, serve up the next one
    if (questionsLeft.length > 0) {
        io.emit("newQuestion", questionsLeft[questionsLeft.length - 1]);
        setTimeout(function(){nextQuestion()}, 7000);
    } else {
        // If we've run out of questions, start again
        console.log("Out of questions");
        initGame('addition'); 

    }
}


let express = require('express');
let app = express();
let ntp = require('socket-ntp-krcmod');

let MIN_WAIT_TIME = 1000; //New sequence will begin after 1000 initial push out of change

let nextBeginTimeInterval;
let sequenceLength;
let currentData = null;

let path=require("path") //assuming express is installed

app.use(express.static('public'))

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/index.html'));
})

app.get('/host', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/host.html'));
})

var server = require('http').createServer(app);

var io = require('socket.io')(server);

//This function sync the time to start so that it falls on a beat and is longer than the minimum wait time
//It also continually increments the start time so that clients can join midway through
function syncWaitTime() {
    console.log("Syncing Wait Time");
    sequenceLength = currentData.nextDuration * currentData.nextColors.length;
    let waitTime = 0;
    var whileLoopCounter = 0;
    //It works with a waitTime measured by sequence lengths so that if the /host has a perfect connection, the sequence starts in time
    //with when they hit 'update'. It's so they can hit 'update' on the beat and the server will respect that and send out the sequence to the
    //Clients on another beat
    while (waitTime < MIN_WAIT_TIME){ //So that it is at least 1 second of waiting and also at least a sequence
        waitTime += sequenceLength;
        whileLoopCounter++;
        if(whileLoopCounter > 1000){
            console.error("Wait time could not be set to any sequence length - while loop could not exit");
            waitTime = MIN_WAIT_TIME;
        }
    }
    console.log("sync/wait time: " + waitTime);
    currentData.beginTime = Date.now() + waitTime; //Add begin time to the data
    //It should wait until the begin time and then run on an interval off that. But also make it ready to update
    //Continually increment nextBeginTime so clients can join midway
    setTimeout(function() { //Aligns server to the start time
        if(nextBeginTimeInterval){
            clearInterval(nextBeginTimeInterval)
        }
        currentData.beginTime += sequenceLength//Need to bump a whole interval ahead and the wait time
        nextBeginTimeInterval = setInterval(function(){ //Continually sets the dateTime of the next sequence start
            currentData.beginTime += sequenceLength; // To wait for message and ntp to sync
            // + sequenceLength + sequenceLength + waitTime;
            //This variable should be sent with clients first connection message
        }, sequenceLength)
    }, waitTime);
}

io.on('connection', function(socket) {
    ntp.sync(socket);
    console.log("connected to:", socket.request.connection.remoteAddress);
    socket.on('warning', function(message) {
        console.log("WARNING: " + message);
    });
    socket.on("hostData", function(data){
        currentData = data;
        syncWaitTime();
        socket.broadcast.emit('newData', currentData); // emit an event to all connected sockets
    });
    socket.on("console", function(log){
        console.log("IP:", socket.request.connection.remoteAddress, "log:", log)
    });
    socket.on("requestData", function(){
        if(currentData){
            socket.emit("newData", currentData);
        }
    })
    socket.on("syncWaitTime", function () {
        console.log("Client called for resyncing time. Client will reload automatically");
        syncWaitTime();
    })
});


server.listen(3000, function(){
    console.log("Server up and listening on port 3000");
});

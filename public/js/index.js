var currentColors = ["#000", "#FFF"];
var currentColorIndex = 0;

var seqenceInterval;
var updateFeedbackColorInterval;

var nextColors = [];
var nextDuration = 1000;

var feedbackText;

var socket;


function changeColor() {
    document.body.style.backgroundColor = getNextColor();
}

function startNewSequence(data) {
    clearInterval(seqenceInterval); //Stop current sequence
    currentColors = data.nextColors; //Set currentColors
    currentColorIndex = 0;
    seqenceInterval = setInterval(changeColor, data.nextDuration)
}

function getNextColor() {
    var returnColor = currentColors[currentColorIndex % currentColors.length]; //Make it safe when accessing, not when adding
    currentColorIndex += 1;
    return returnColor;
}

function setData(data) {
    /*
    Data is sent by server with a specific millisecond start time, assuming everyone's clocks have been synced
    The server says to wait until the specific millisend (maybe a second on from server time) before beginning this new sequence
    This is to give time for everyone to get the new message
    The new sequence starts once time reaches this sent start time
    */
    try{
        //ntp.servertime() gives you the estimated time on the server at the time this is called
        //ntp.offset gives you the time between the two clocks


        //It needs to work modulus to each beat, because what if it was 1.1 bars out of sync, it should only wait .1
        //Some clocks are very far out of sync ? Or is it good now because synced
        var waitTime = data.beginTime - ntp.serverTime(); //If negative time there will be no delay
        // console.log("Waiting time: " + waitTime);
        // console.log("begin time: " + data.beginTime);
        // console.log("ntp time: " + ntp.serverTime());
        if (waitTime < 0) { //DEBUG // This can happen because wait time is not set again when a host connects late sometimes
            console.error("Sync time out")
            socket.emit("syncWaitTime"); //Not sure how it gets out of sync, but it can if you try
            window.setTimeout(function () { 
                window.location.reload(); //Just to make sure things become fine
            }, 4000)
        }
        window.setTimeout(function() {
            startNewSequence(data);
        }, waitTime);
        clearInterval(updateFeedbackColorInterval);
        feedbackText.textContent = "";
        if(data.fade){
            document.body.style.transition = "background-color "+ data.nextDuration/1000.0 +"s ease-in-out"
        }else{
            document.body.style.transition = "initial";
        }
    }catch(e){
        alert("Reloading after Error: " + e);
        location.reload();
    }

}

function updateFeedbackColor(){
    feedbackText.style.color = "rgb("
    + Math.floor(Math.random()*255)
    + ","
    + Math.floor(Math.random()*255)
    + ","
    + Math.floor(Math.random()*255)
    + ")";
}

window.onload = function () {
    tryConnect();
    seqenceInterval = setInterval(changeColor, 3000);
    feedbackText = document.getElementsByClassName("feedback-text")[0];
    changeColor();
    updateFeedbackColor();
    updateFeedbackColorInterval = setInterval(updateFeedbackColor, 1000);
}

function toggleFullscreen() { 
    var doc = window.document;
    var docEl = doc.documentElement;
  
    var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
  
    if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
      requestFullScreen.call(docEl);
    }
    else {
      cancelFullScreen.call(doc);
    }
}

function tryConnect() { 
    try {
        console.log("Trying to connect")
        socket = io.connect();
        window.socket = socket;
        ntp.init(socket);
        socket.on('connect', function () {
            console.log("connected");
            feedbackText.textContent = "Syncing";
            window.setTimeout(function () {
                socket.emit("requestData")
            }, 2000) //To allow for ntp to sync up
        });
        socket.on('newData', setData);
        socket.on('disconnect', function () {
            console.log("disconnected")
            feedbackText.textContent = "Disconnected";
            window.setTimeout(function () { 
                tryConnect();
            }, 4000)
        });
    } catch (e) { 
        console.warn(e);
        window.setTimeout(function () { 
            tryConnect();
        }, 4000)
    }    
}

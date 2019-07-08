var currentColors = [
  [ //Frame 1
    ["#000"] //Row 1
  ],
  [ //Frame 2
    ["#FFF"] //Row 1
  ]
];

var currentColorIndex = 0;

var seqenceInterval;
var updateFeedbackColorInterval;

var feedbackText;

var socket;

function clearTable(){
  var tableElement = document.getElementById("color-table");
  while (tableElement.firstChild) {
    tableElement.removeChild(tableElement.firstChild);
  }
}

//Flaw for the sake of optimisation: creates a table the size of the FIRST color table so the html is created just once
function createTable(fade, duration) {
  clearTable(); //Clear current table
  var tableElement = document.getElementById("color-table");
  var colorFrame = getCurrentColorFrame();
  for(var rowNum = 0; rowNum < colorFrame.length; rowNum++){
    var row = window.document.createElement("tr");
    for(var colNum = 0; colNum < colorFrame[rowNum].length; colNum++){
      var col = window.document.createElement("td");
      if(fade){
        col.style.transition = "background-color " + duration / 1000.0 + "s ease-in-out"
      }else{
        col.style.transition = "initial";
      }
      row.appendChild(col);
    }
    tableElement.appendChild(row);
  }
}


function colorTable(){
  try {
    var currentColorFrame = getCurrentColorFrame();
    incrementTable();
    var tableRows = document.getElementById("color-table").children;
    for (var rowNum = 0; rowNum < tableRows.length; rowNum++) {
      for (var colNum = 0; colNum < tableRows[rowNum].children.length; colNum++) {
        tableRows[rowNum].children[colNum].style.backgroundColor = currentColorFrame[rowNum][colNum];
      }
    }
  }catch(e){
    console.error("Could not color table");
  }
}

function startNewSequence(data) {
  clearInterval(seqenceInterval); //Stop current sequence

  //It will only accept the length of the first row and the first column. Anything else is ignored for now. This is so that it is not recreating a table
  //On each frame

  currentColors = data.nextColors;
  currentColorIndex = 0;

  createTable(data.fade, data.nextDuration);
  colorTable(); //So it colours at the first opportunity

  seqenceInterval = setInterval(colorTable, data.nextDuration);
}

function getCurrentColorFrame() { //Returns arrays of colors or just singular color
  var returnColor = currentColors[currentColorIndex % currentColors.length]; //Make it safe when accessing, not when adding
  return returnColor;
}

function incrementTable(){
  currentColorIndex += 1;
}

function setData(data) {
  /*
  Data is sent by server with a specific millisecond start time, assuming everyone's clocks have been synced
  The server says to wait until the specific millisend (maybe a second on from server time) before beginning this new sequence
  This is to give time for everyone to get the new message
  The new sequence starts once time reaches this sent start time
  */
  try {
    //ntp.servertime() gives you the estimated time on the server at the time this is called
    //ntp.offset gives you the time between the two clocks


    //It needs to work modulus to each beat, because what if it was 1.1 bars out of sync, it should only wait .1
    //Some clocks are very far out of sync ? Or is it good now because synced
    var waitTime = data.beginTime - ntp.serverTime(); //If negative time there will be no delay
    // console.log("Waiting time: " + waitTime);
    // console.log("begin time: " + data.beginTime);
    // console.log("ntp time: " + ntp.serverTime());
    if (waitTime < 0) { //DEBUG // This can happen because wait time is not set again when a host connects late sometimes - look into it
      console.error("Sync time out");
      socket.emit("syncWaitTime"); //Not sure how it gets out of sync, but it can if you try
      window.setTimeout(function () {
        window.location.reload(); //Just to make sure things become fine
      }, 4000)
    }
    window.setTimeout(function () {
      startNewSequence(data);
    }, waitTime);
    clearInterval(updateFeedbackColorInterval);
    feedbackText.textContent = "";
  } catch (e) {
    alert("Reloading after Error: " + e);
    window.setTimeout(function () {
      window.location.reload(); //Just to make sure things become fine
    }, 4000)
  }

}

function randomColor() {
  // returns a random hex color
  return "#" + Math.floor(Math.random() * parseInt("FFFFFF", 16)).toString(16)
}

function makeUpdateFeedbackColor(f) {
  return ()=>(feedbackText.style.color = f())
}

let updateFeedbackColor = makeUpdateFeedbackColor(()=>"#AAAAAA")
// let updateFeedbackColor = makeUpdateFeedbackColor(randomColor)

window.onload = function () {
  tryConnect();
  createTable(true, 3000);
  seqenceInterval = setInterval(colorTable, 3000);
  feedbackText = document.getElementsByClassName("feedback-text")[0];
  colorTable();
  updateFeedbackColor();
  updateFeedbackColorInterval = setInterval(updateFeedbackColor, 1000);
}

function toggleFullscreen() {
  var doc = window.document;
  var docEl = doc.documentElement;

  var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
  var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

  if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
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
      console.log("disconnected");
      feedbackText.textContent = "_";
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

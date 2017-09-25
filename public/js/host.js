sendData = function(form){
    var nextColors = [];
    if(form["color1on"].checked){
        nextColors.push("#" + form["color1"].value);
    }
    if(form["color2on"].checked){
        nextColors.push("#" + form["color2"].value);
    }
    if(form["color3on"].checked){
        nextColors.push("#" + form["color3"].value);
    }
    if(form["color4on"].checked){
        nextColors.push("#" + form["color4"].value);
    }
    var nextTempo = parseFloat(form["tempoInput"].value);

    var multiplier = parseFloat(form["multiplier"].value);
    var nextDuration = (240.0 / nextTempo / nextColors.length / multiplier) * 1000.0 //Divide by 60 to get beats per second (eg. 60 > 1) then * 1000 to get to ms
    if(isNaN(nextDuration)){
        console.error("NaN tempo", nextDuration);
        nextDuration = 2000;
    }
    var payload = {'nextColors' : nextColors, 'nextDuration': nextDuration, 'fade': form["fade"].checked};
    console.log("sending",payload);
    socket.emit("hostData", payload);
    console.log("sent")
    return false;
}

setLabelColorValue = function(inputElement){
    if(inputElement.checked){
        inputElement.labels[0].textContent = "On"
    }else{
        inputElement.labels[0].textContent = "Off"
    }
}

window.onload = function(){
    "use strict";

    window.socket = io();
    socket.on('connect', function() {
        console.log("connected")
    });
    socket.on('disconnect', function() {
        console.log("disconnected")
    });

    (function (TapTempo, document) {
        'use strict';

        var tapTempo = new TapTempo(),
            display = document.getElementById('tempoInput');

        tapTempo.ontempochange = function () {
            console.log(tapTempo.tempo)
            display.value = tapTempo.tempo;
        };

        window.addEventListener('keypress', function (e) {
            if(e.code.substring(0,5) !== "Digit"){
                tapTempo.tap();
            }
        }, false);

    }(this.TapTempo, this.document));
}


//TODO On receiving from the host, Make it fit on the beat > factor in delay and add beats*delay as the wait time

var currentPickerGroups = [];

sendData = function (form) {
  if(!currentPickerGroups || !currentPickerGroups[0] || !currentPickerGroups[0][0] || !currentPickerGroups[0][0][0]){
    return false;
  }

  var nextColorFrames = getEmpty3DArray(currentPickerGroups.length, currentPickerGroups[0].length, currentPickerGroups[0][0].length);

  for (var pickerFrameIndex = 0; pickerFrameIndex < nextColorFrames.length; pickerFrameIndex++){
    for(var pickerRowIndex = 0; pickerRowIndex < nextColorFrames[pickerFrameIndex].length; pickerRowIndex++){
      for(var pickerColIndex = 0; pickerColIndex < nextColorFrames[pickerFrameIndex][pickerRowIndex].length; pickerColIndex++){
        var pickerGroup = currentPickerGroups[pickerFrameIndex][pickerRowIndex][pickerColIndex];
        //Get values from the inputs
        nextColorFrames[pickerFrameIndex][pickerRowIndex][pickerColIndex] = pickerGroup.lastChild.value || "#000"
      }
    }
  }

  if(form["animate"].checked){
    var numberOfFrames = nextColorFrames[0].length * nextColorFrames[0][0].length;
    for(var frameIndex = 1; frameIndex < numberOfFrames; frameIndex++){
      nextColorFrames[frameIndex] = newShifted2DArray(nextColorFrames[frameIndex-1], true)
    }
  }

  console.log(nextColorFrames);

  var nextTempo = parseFloat(form["tempoInput"].value);

  var multiplier = parseFloat(form["multiplier"].value);
  var nextDuration = (240.0 / nextTempo / nextColorFrames.length / multiplier) * 1000.0; //Divide by 60 to get beats per second (eg. 60 > 1) then * 1000 to get to ms
  if (isNaN(nextDuration) || !isFinite(nextDuration)) {
    console.error("NaN/Infinite tempo", nextDuration);
    nextDuration = 2000;
  }
  var payload = {'nextColors': nextColorFrames, 'nextDuration': nextDuration, 'fade': form["fade"].checked};
  console.log("sending", payload);
  socket.emit("hostData", payload);
  console.log("sent");
  return false;
}

setLabelToggle = function (inputElement, onMessage, offMessage) {
  if (inputElement.checked) {
    inputElement.labels[0].textContent = onMessage
  } else {
    inputElement.labels[0].textContent = offMessage
  }
}

changeAnimate = function(element){
  console.log(element.checked)
  if(element.checked){
    document.getElementById("frame-group").style.display = "none";
  }else{
    document.getElementById("frame-group").style.display = "block";
  }
  updatePickers();
  setLabelToggle(element, 'Animate', 'Do Not Animate')
};

newShifted2DArray = function(arr, forwards){
  if(!(arr && arr.length && arr[0] && arr[0].length)){
    console.error("Invalid arguments given to newShifted2DArray");
    return [];
  }

  var newArray = getEmpty2DArray(arr.length, arr[0].length);

  for(var rowIndex = 0; rowIndex < arr.length; rowIndex++){
    for(var columnIndex = 0; columnIndex < arr[0].length; columnIndex++){
      var newIndexes;
      if(forwards){
        newIndexes = increaseIndexIn2DArray(rowIndex, arr.length, columnIndex, arr[0].length);
      }else{
        newIndexes = decreaseIndexIn2DArray(rowIndex, arr.length, columnIndex, arr[0].length);
      }
      //If you put it as newArray[rowIndex][columnIndex] = arr[newIndex...] it reverses it perfectly. One algorithm could be used.s
      newArray[newIndexes.newRowIndex][newIndexes.newColIndex] = arr[rowIndex][columnIndex];
    }
  }
  return newArray;
};

increaseIndexIn2DArray = function(rowIndex, rowsLength, columnIndex, columnsLength){
  var maxColIndex = columnsLength - 1;
  var newColIndex = columnIndex + 1;
  var newRowIndex = rowIndex;
  if (newColIndex > maxColIndex) { //Should move to another row?
    newRowIndex = (rowIndex + 1) % rowsLength;
    newColIndex = 0;
  }
  return {newColIndex, newRowIndex}
};

decreaseIndexIn2DArray = function(rowIndex, rowsLength, columnIndex, columnsLength){
  var maxColIndex = columnsLength - 1;
  var newRowIndex = rowIndex;
  var newColIndex = columnIndex - 1;
  if (newColIndex < 0) { //Should move to another row?
    newRowIndex = ((rowIndex - 1 + rowsLength) % rowsLength);
    //Adding the length value means it can handle negative values
    newColIndex = maxColIndex;
  }
  return {newColIndex, newRowIndex}
};

getEmpty3DArray = function(framesLength, rowsLength, columnsLength){
  var newFrameArray = new Array(framesLength); //Array of frames
  for(var frameIndex = 0; frameIndex < framesLength; frameIndex++){
    var newRowArray = new Array(rowsLength);
    for(var rowIndex = 0; rowIndex < rowsLength; rowIndex++){
      newRowArray[rowIndex] = new Array(columnsLength); //Column array
    }
    newFrameArray[frameIndex] = newRowArray;
  }
  return newFrameArray;
};

getEmpty2DArray = function(rowsLength, columnsLength){
    var newRowArray = new Array(rowsLength);
    for(var rowIndex = 0; rowIndex < rowsLength; rowIndex++){
      newRowArray[rowIndex] = new Array(columnsLength); //Column array
    }
    return newRowArray;
};

createPreviewTable = function(rowsLength, columnsLength, activeRowIndex, activeColumnIndex){
  var previewTable = document.createElement("table");
  previewTable.className = "preview-table";
  for(var rowIndex = 0; rowIndex < rowsLength; rowIndex++){
    var row = document.createElement("tr");
    for(var columnIndex = 0; columnIndex < columnsLength; columnIndex++){
      var column = document.createElement("td");
      if(rowIndex === activeRowIndex && columnIndex === activeColumnIndex){
        column.className = "active";
      }
      row.appendChild(column);
    }
    previewTable.appendChild(row);
  }
  return previewTable;
};

generatePreviewTables = function(pickerGroups){
  for (var pickerFrameIndex = 0; pickerFrameIndex < pickerGroups.length; pickerFrameIndex++){
    for(var pickerRowIndex = 0; pickerRowIndex < pickerGroups[pickerFrameIndex].length; pickerRowIndex++){
      for(var pickerColumnIndex = 0; pickerColumnIndex < pickerGroups[pickerFrameIndex][pickerRowIndex].length; pickerColumnIndex++){
        var pickerGroup = pickerGroups[pickerFrameIndex][pickerRowIndex][pickerColumnIndex];
        
        //Delete preview tables in picker group. Should just be one.
        var previewTables =pickerGroup.getElementsByClassName("preview-table");
        for(var previewTableIndex = 0; previewTableIndex < previewTables.length; previewTableIndex++){
          pickerGroup.removeChild(previewTables[previewTableIndex]);
        }
        
        //Create preview table
        var previewTable = createPreviewTable(pickerGroups[pickerFrameIndex].length, pickerGroups[pickerFrameIndex][pickerRowIndex].length, pickerRowIndex, pickerColumnIndex)

        var pickers = pickerGroup.getElementsByClassName("picker");
        if(pickers[0]){
          pickerGroup.insertBefore(previewTable, pickers[0]);
        }
      }
    }
  }
};

updatePickers = function(element) {
  var form;
  if(typeof element === "undefined"){
    form = document.getElementById("form")
  }else{
    form = element.form;
  }


  //Method is to make a new array, copy the elements into their positions in the new array
  //And then fill the null occurences
  //Gargbage automatically collected
  var framesLength;
  if(form["animate"].checked){
    framesLength = 1;
  }else{
    framesLength = (parseInt(form["frameCount"].value) > 0 && parseInt(form["frameCount"].value)) || 1
  }
  var rowsLength = (parseInt(form["rowCount"].value) > 0 && parseInt(form["rowCount"].value)) || 1;
  var columnsLength = (parseInt(form["columnCount"].value) > 0 && parseInt(form["columnCount"].value)) || 1;


  var newPickerGroups = getEmpty3DArray(framesLength, rowsLength, columnsLength);

  var pickerContainer = document.getElementById("pickers-container");
  
  //Create new pickers in empty spaces
  for (var frameIndex = 0; frameIndex < framesLength; frameIndex++) {
    for (var rowIndex = 0; rowIndex < rowsLength; rowIndex++) {
      for (var columnIndex = 0; columnIndex < columnsLength; columnIndex++) {

        //If an old picker exists at the same index, keep it
        var oldPickerGroupAtPosition =
          currentPickerGroups
          && currentPickerGroups[frameIndex]
          && currentPickerGroups[frameIndex][rowIndex]
          && currentPickerGroups[frameIndex][rowIndex][columnIndex]
          || null;

        if(oldPickerGroupAtPosition){
          //Put it in the new array
          newPickerGroups[frameIndex][rowIndex][columnIndex] = oldPickerGroupAtPosition;
        }else{
          //If picker does not exist, make one
          var pickerGroup = document.createElement("div");
          pickerGroup.className = "form-group picker-group";
          var id = "color-" + frameIndex + "" + rowIndex + "" + columnIndex;
          // var label = document.createElement("label");
          // var labelText = "Frame " + (frameIndex+1) + ", Row " + (rowIndex+1) + ", Column" + (columnIndex+1);
          // label.for = id;
          // label.appendChild(document.createTextNode(labelText));
          var previewTable = createPreviewTable(rowsLength, columnsLength, rowIndex, columnIndex);
          var pickerInput = document.createElement("input");
          pickerInput.type = "color";
          pickerInput.value = "#ffffff";
          pickerInput.className = "form-control picker jscolor";
          pickerInput.id = id;
          pickerInput.name = id;
          // pickerGroup.appendChild(label);
          pickerGroup.appendChild(previewTable);
          pickerGroup.appendChild(pickerInput);
          newPickerGroups[frameIndex][rowIndex][columnIndex] = pickerGroup;
        }
      }
    }
  }

  //Clear all DOM content (DOM will remain in JS array)
  while (pickerContainer.firstChild) {
    pickerContainer.removeChild(pickerContainer.firstChild);
  }

  //Put the new array in
  for (var newPickerFrameIndex = 0; newPickerFrameIndex < newPickerGroups.length; newPickerFrameIndex++){
    for(var newPickerRowIndex = 0; newPickerRowIndex < newPickerGroups[newPickerFrameIndex].length; newPickerRowIndex++){
      for(var newPickerColumnIndex = 0; newPickerColumnIndex < newPickerGroups[newPickerFrameIndex][newPickerRowIndex].length; newPickerColumnIndex++){
        pickerContainer.appendChild(newPickerGroups[newPickerFrameIndex][newPickerRowIndex][newPickerColumnIndex]);
      }
    }
  }

  generatePreviewTables(newPickerGroups);

  currentPickerGroups = newPickerGroups; //Automatic garbage collection to remove pickers not in array
};

window.onload = function () {
  "use strict";

  window.socket = io();
  socket.on('connect', function () {
    console.log("connected")
  });
  socket.on('disconnect', function () {
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
      if (e.code.substring(0, 5) !== "Digit") {
        tapTempo.tap();
      }
    }, false);

  }(this.TapTempo, this.document));
  updatePickers();
};
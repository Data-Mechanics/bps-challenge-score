/**
 * Submission scoreboard functionalities.
 */

$( document ).ready(function() {
  // Initialize firebase.
  var config = {
    apiKey: "AIzaSyCvVMjlA_Gsh2xqukgSNN5AdFevJjCv9lU",
    authDomain: "bps-scorer.firebaseapp.com",
    databaseURL: "https://bps-scorer.firebaseio.com",
    projectId: "bps-scorer",
    storageBucket: "bps-scorer.appspot.com",
    messagingSenderId: "473750220771"
  };
  firebase.initializeApp(config);
  // Get a reference to the database service.
  database = firebase.database();
  var dataList = [];
  // Retrieve current scores and attach listener.
  // firebase.database().ref('/bps-scorer/').on('value', function(snapshot) {
  firebase.database().ref('/bps-scorer/').once('value').then(function(snapshot) {
    snapshot.forEach(function(childSnapshot) { dataList.push(childSnapshot.val()); });
    CreateTableFromJSON(dataList); // Construct and show datatable.
  });
});

function CreateTableFromJSON(dataList) {
  //delete older table first

  g_dataList = dataList;

  for (var i = 0 ; i < dataList.length; i++) {
    dataList[i] = $.map(g_dataList[i], function(el) { return el });
    dataList[i].splice(1,1)
  }

  $('#scoreTable').DataTable({
    data: dataList,
    columns: [
      {title: "Bus Id"},
      {title: "Maximum Route Distance"},
      {title: "Organization"},
      {title: "Total Distance Travelled"}
    ],
    "order": [[3, "desc"]]
  });
}

function writeUserData(orgName, csvtext, bestRouteID, totalDistance, maxDistRoute) {

  // Change this: https://console.firebase.google.com/project/bps-scorer/database/rules if facing security issues.
  // { "rules": { ".read":true, ".write":true } }
  // Update table.
  firebase.database().ref().child('bps-scorer').push({
    orgName: orgName,
    csvtext: csvtext,
    bestRouteID: bestRouteID,
    totalDistance : totalDistance,
    maxDistRoute: maxDistRoute
  }).then(function(snapshot) {
    // Read data to update table again.
    firebase.database().ref('/bps-scorer/').once('value').then(function(snapshot) {
      //new data list
      var dataList =[]
      snapshot.forEach(function(childSnapshot) {
        var childData = childSnapshot.val();
        dataList.push(childData);
      });
      //Construct and show datatable
      // buildHtmlTable("#scoreTable", dataList);
      $('#scoreTable').dataTable().fnDestroy();
      CreateTableFromJSON(dataList);
    });
  });
}

  //ref: https://mounirmesselmeni.github.io/2012/11/20/reading-csv-file-with-javascript-and-html5-file-api/

function handleFiles(files) {
  // Check for the various File API support.
  if (window.FileReader) {
    // FileReader are supported.
    getAsText(files[0]);
  } else {
    alert('FileReader are not supported in this browser.');
  }
}

function getAsText(fileToRead) {
  var reader = new FileReader();
  // Read file into memory as UTF-8      
  reader.readAsText(fileToRead);
  // Handle errors load.
  reader.onload = loadHandler;
  reader.onerror = errorHandler;
}

function loadHandler(event) {
  var csv = event.target.result;
  processData(csv);
}

function processData(csv) {
  var allTextLines = csv.split(/\r\n|\n/);
  var lines = [];
  for (var i=0; i < allTextLines.length; i++) {
    var data = allTextLines[i].split(';');
    var tarr = [];
    for (var j = 0; j < data.length; j++)
      tarr.push(data[j]);
    lines.push(tarr);
  }
  compute(lines, csv);
}

function errorHandler(evt) {
  if (evt.target.error.name == "NotReadableError") {
    alert("Cannot read file!");
  }
}

function compute(lines, csv) {
  var totalDistance=0;
  var maxDistRoute=0;
  var routeDistance =0;
  var busTravellinMaxDist='';

  document.getElementById("progress").innerHTML='<div class="progress"><div id="bar" class="progress-bar" role="progressbar" aria-valuenow="70" aria-valuemin="0" aria-valuemax="100" width="1%"><span class="sr-only"></span></div></div>'

  //hide progress
  // document.getElementById("progress").innerHTML=""

  //Add to firebase here
  document.getElementById("result").innerHTML = "Total distance travelled by all buses is: <strong> " + totalDistance+" meters </strong><br>Maxiumum distance is travelled by <strong> bus route  " + busTravellinMaxDist + " </strong> which is " + maxDistRoute+ " meters";

  var orgName = document.getElementById("orgName").value
  writeUserData(orgName, csv , busTravellinMaxDist, totalDistance, maxDistRoute);

  //reset input
  document.getElementById('csvFileInput').value = null;
}

/* eof */
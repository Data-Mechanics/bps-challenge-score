/**
 * Submission scoreboard functionalities.
 */

var scoreboard_spinner; 

$(document).ready(function() {
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
  firebase.database().ref('/bps-scorer/').once('value').then(function(snapshot) {
    snapshot.forEach(function(childSnapshot) { dataList.push(childSnapshot.val()); });
    scoreboard_update(scoreboard, dataList); // Construct and show datatable.
  });

  scoreboard = scoreboard_create();
  $('#scoreboard_container').fadeTo(100, 0.5);
  scoreboard_spinner = new Spinner().spin(document.getElementById('scoreboard'));
});

function scoreboard_update(scoreboard, data) {
  for (var i = 0 ; i < data.length; i++) {
    data[i] = $.map(data[i], function(el) { return el });
    data[i].splice(1,1);
  }
  scoreboard.clear();
  scoreboard.rows.add(data);
  scoreboard.draw();
  $('#scoreboard_container').fadeTo(100, 1);
  scoreboard_spinner.stop();
}

function scoreboard_create() {
  var scoreboard = $('#scoreboard').DataTable({
    data: [],
    columns: [
      {title: "Bus Id"},
      {title: "Maximum Route Distance"},
      {title: "Submitter"},
      {title: "Total Distance Travelled"}
    ],
    "order": [[3, "desc"]]
  });
  return scoreboard;
}

function scoreboard_add(scoreboard, orgName, csvtext, bestRouteID, totalDistance, maxDistRoute) {
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
      scoreboard_update(scoreboard, dataList);
    });
  });
}

function compute(lines, csv) {
  var totalDistance=0;
  var maxDistRoute=0;
  var routeDistance =0;
  var busTravellinMaxDist='';

  document.getElementById("progress").innerHTML='<div class="progress"><div id="bar" class="progress-bar" role="progressbar" aria-valuenow="70" aria-valuemin="0" aria-valuemax="100" width="1%"><span class="sr-only"></span></div></div>'

  //Add to firebase here.
  document.getElementById("result").innerHTML = "Total distance travelled by all buses is: <strong> " + totalDistance+" meters </strong><br>Maxiumum distance is travelled by <strong> bus route  " + busTravellinMaxDist + " </strong> which is " + maxDistRoute+ " meters";

  var orgName = document.getElementById("orgName").value
  scoreboard_add(scoreboard, orgName, csv , busTravellinMaxDist, totalDistance, maxDistRoute);
}

/* eof */
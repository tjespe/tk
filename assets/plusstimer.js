// Hide console if requested in URL
if (location.hash.indexOf('hidepre') > -1) setTimeout(()=>{
  document.querySelector("pre").style.display = "none";
}, 100);

// Your Client ID can be retrieved from your project in the Google
// Developer Console, https://console.developers.google.com
let CLIENT_ID = '1068107389496-sapmb6nh9l85vccdke6ju2jsbv5ibs51.apps.googleusercontent.com';

let SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"];

let spreadsheetId, spreadSheetName;

let q = (s)=>document.querySelector(s);
let emptyPre = ()=>q('pre').innerHTML = "";
let version = {
  key:"Plusstimer 2017 høst Ulv Rotte", // A unique identifier for the document
  title: 'Plusstimer høst 2017 Oppdatert', // The name the spreadsheet will have in user's Drive
  template: "17x1xBTLtThJMk7qrQpReAbczYQDCceHD1eTgh3Vmi84", // The drive id for the template
  range: "D7:G7", // The range where days, hours and plusstimer can be found
  days: [0,0], // The vertical and horizontal position of days in the range, respectively
  hours: [0,1], // The vertical and horizontal position of hours in the range, respectively
  plusstimer: [0,3]  // The vertical and horizontal position of plusstimer in the range, respectively
};
let firstVisit = false;

/**
* compatible_versions is an array of objects where each object has these properties:
* key {string} A unique identifier for the spreadsheet
* days {string} The cell where days are saved
* hours {string} The cell where hours are saved
*/
let compatible_versions = [{
	key: "Plusstimer 2017 høst Panda Bever",
	days: "Plusstimer!D7",
	hours: "Plusstimer!E7"
}];

/**
* Check if current user has authorized this application.
*/
function checkAuth() {
  gapi.auth.authorize(
    {
      'client_id': CLIENT_ID,
      'scope': SCOPES.join(' '),
      'immediate': true
    }, handleAuthResult
  );
}

/**
* Handle response from authorization server.
*
* @param {Object} authResult Authorization result.
*/
function handleAuthResult(authResult) {
  var authorizeDiv = document.getElementById('authorize-div');
  if (authResult && !authResult.error) {
    // Hide auth UI, then load client library.
    authorizeDiv.style.display = 'none';
    loadGDriveApi();
    //loadSheetsApi();
  } else {
    // Show auth UI, allowing the user to initiate authorization by
    // clicking authorize button.
    authorizeDiv.style.display = 'inline';
  }
}

/**
* Initiate auth flow in response to user clicking authorize button.
*
* @param {Event} event Button click event.
*/
function handleAuthClick(event) {
  gapi.auth.authorize(
    {client_id: CLIENT_ID, scope: SCOPES, immediate: false},
    handleAuthResult
  );
  appendPre('Autoriserer…');
  return false;
}

/**
* Load Google Drive API library.
*/
function loadGDriveApi() {
  appendPre('Laster inn viktige filer…');
  gapi.client.load('drive', 'v2', findFile);
}

/**
* Find the right file.
*/
function findFile() {
  appendPre('Finner regnearket…')
  var request = gapi.client.drive.files.list({
    "q": "fullText contains '"+version.key+"'"
  });
  request.execute(function(resp) {
    if (!resp.error) {
      spreadsheetId = getID(resp.items);
      if (spreadsheetId) {
        loadSheetsApi()
      }
    } else if (resp.error.code == 401) {
      // Access token might have expired.
      checkAuth();
    } else {
      appendPre('En feil oppsto: ' + resp.error.message);
    }
  });
}

/**
* Find ID of the right file or create a file if none exist and return ID
*/
function getID(items) {
  for (var i = 0; i < items.length; i++) {
    if (items[i].mimeType == "application/vnd.google-apps.spreadsheet") {
      spreadSheetName = items[i].title;
      return items[i].id;
    }
  }
  appendPre('Oppretter regneark…');
  spreadSheetName = "Plusstimer";
  return copyFile();
}

/**
* Load Sheets API client library.
*/
function loadSheetsApi(update) {
  appendPre('Laster inn flere viktige filer…');
  var discoveryUrl =
  'https://sheets.googleapis.com/$discovery/rest?version=v4';
  gapi.client.load(discoveryUrl).then(outputData);
  if (typeof update !== "undefined" && update) updateSheet();
}

/**
* Print the data:
*/
function outputData() {
  appendPre('Laster inn plusstimer…');
  if (typeof spreadsheetId === 'string' && spreadsheetId.length > 5) {
    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'Plusstimer!'+version.range,
    }).then(function(response) {
      appendPre('Lasting fullført.');
      var range = response.result;
      if (range.values.length > 0) {
        days = range.values[version.days[0]][version.days[1]];
        hours = range.values[version.hours[0]][version.hours[1]];
        appendPre(range.values[version.plusstimer[0]][version.plusstimer[1]] + 'plusstimer');
        q('#result>number').innerHTML = Number(range.values[0][3]);
        q('#result').style.display = 'block';
        q('#caption').style.display = 'block';
        q('#caption>a').innerText = "Jeg har ikke "+days+" dager og "+hours+" timer fravær. Oppdater";
        q('#output').style.display = 'none';
      } else {
        appendPre('Fant ingen data.');
      }
      if (firstVisit) updateSheet();
    }, function(response) {
      appendPre('Feil: ' + response.result.error.message);
    });
  } else {
    appendPre('Something went wrong, refresh the page and try again');
  }
}

/**
* Copy an existing file.
*/
function copyFile() {
  if (compatible_versions.length) {
    appendPre('Prøver å finne et gammelt regneark…')
    var version_request = gapi.client.drive.files.list({
      "q": "fullText contains '"+compatible_versions[0].key+"'"
    });
    version_request.execute(function(resp) {
      if (!resp.error) {
        let oldSheet;
        let items = resp.items;
        for (var i = 0; i < items.length; i++) {
          if (items[i].mimeType == "application/vnd.google-apps.spreadsheet") {
            appendPre('Fant et gammelt regneark');
            oldSheetId = items[i].id;
            gapi.client.load('https://sheets.googleapis.com/$discovery/rest?version=v4').then(()=>{
              gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: oldSheetId,
                range: compatible_versions[0].days,
              }).then(function(response) {
                let days = response.result.values[0][0]
                  gapi.client.sheets.spreadsheets.values.get({
                    spreadsheetId: oldSheetId,
                    range: compatible_versions[0].hours,
                  }).then(function(response) {
                    let hours = response.result.values[0][0];
                    updateSheet(days, hours, true);
                  });
              });
            });
          }
        }
      }
    });
  }
  var body = {'title': version.title};
  var request = gapi.client.drive.files.copy({
    'fileId': version.template,
    'resource': body
  });
  request.execute(function(resp) {
    spreadsheetId = resp.id;
    loadSheetsApi();
    firstVisit = true;
  });
}

/*
* Oppdater fravær
*/
var days, hours;
function updateSheet(preset_days, preset_hours, skip_conf) {
  emptyPre();
  days = typeof preset_days !== "undefined" ? preset_days : prompt('Hvor mange hele DAGER fravær har du på skolearena?\nf.eks. 2', days);
  hours = typeof preset_hours !== "undefined" ? preset_hours : prompt('Hvor mange TIMER fravær har du på skolearena?\nf.eks. 23,75', hours);
  if ((typeof skip_conf !== "undefined" && skip_conf) || (days && hours && confirm("Er dette riktig informasjon?:\nDager: "+days+"\nTimer: "+hours))) {
    q('#output').style.display = 'block';
    firstVisit = false;
    values = [];
    values[version.days[0]] = [];
    values[version.days[0]][version.days[1]] = days;
    values[version.hours[0]] = [];
    values[version.hours[0]][version.hours[1]] = hours;
    appendPre('Oppdaterer fravær…');
    gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: "'Plusstimer'!"+version.range,
      valueInputOption: 'USER_ENTERED',
      values: values
    }).then(function (resp) {
      appendPre('Fravær er oppdatert, laster inn plusstimer på nytt…');
      outputData();
    })
  } else {
    updateSheet(preset_days, preset_hours, skip_conf);
  }
}

/**
* Append a pre element to the body containing the given message
* as its text node.
*
* @param {string} message Text to be placed in pre element.
*/
function appendPre(message) {
  var pre = document.getElementById('output');
  var textContent = document.createTextNode(message + '\n');
  pre.appendChild(textContent);
}
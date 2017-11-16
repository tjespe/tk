// Hide console if requested in URL
if (location.hash.indexOf('hidepre') > -1) setTimeout(()=>{
  document.querySelector("pre").style.display = "none";
}, 100);

let CLIENT_ID = '1068107389496-sapmb6nh9l85vccdke6ju2jsbv5ibs51.apps.googleusercontent.com'; // Client ID from https://console.developers.google.com
let SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"];
let spreadsheetId; // ID of the spreadsheet on the user's Drive

let q = (s)=>document.querySelector(s); // Quickly select HTML elements using a CSS selector
let version = { // Info regarding the current version of the spreadsheet
  key: "Plusstimer 2017 høst Ulv Rotte", // A unique identifier for the document
  title: "Plusstimer høst 2017 Oppdatert", // The name the spreadsheet will get in the user's Drive
  template: "17x1xBTLtThJMk7qrQpReAbczYQDCceHD1eTgh3Vmi84", // The drive id for the template
  range: "Plusstimer!D7:G7", // The range where days, hours and plusstimer can be found (include name of sheet if more than one sheet in spreadsheet)
  days: [0,0], // The vertical and horizontal position of days in the range, respectively
  hours: [0,1], // The vertical and horizontal position of hours in the range, respectively
  plusstimer: [0,3],  // The vertical and horizontal position of plusstimer in the range, respectively
  title: "Plusstimer Høst 2017" // The title the spreadsheet will get on the user's Drive
};
let firstVisit = false; // Whether or not the user has visited this page earlier

/**
* compatible_versions is an array objects where each object looks like this:
{
  key: "Plusstimer 2016 vår Canada Random Words",   // A string of random words only found in that spreadsheet
  days: "B6",                                       // The cell that contains amount of days abscence
  hours: "D7"                                       // The cell that contains amount of hours abscence
}
* The point of this array is to copy values from an existing spreadsheet so that the user does not have to re-enter them
*/
let compatible_versions = [{
  key: "Plusstimer 2017 høst Panda Bever",
  days: "Plusstimer!D7",
  hours: "Plusstimer!E7"
}];

/**
* Handle response from authorization server.
*
* @param {Object} authResult Authorization result.
*/
function handleAuthResult(authResult) {
  let authDiv = document.getElementById('authorize-div');
  if (authResult && !authResult.error) {
    // Hide auth UI, then load client library.
    authDiv.style.display = 'none';
    loadGDriveApi();
  } else {
    // Show auth UI, allowing the user to initiate authorization by clicking a button.
    authDiv.style.display = 'inline';
  }
}

/**
* Initiate auth flow in response to user clicking authorize button.
*/
function handleAuthClick() {
  gapi.auth.authorize(
    {client_id: CLIENT_ID, scope: SCOPES, immediate: false},
    handleAuthResult
  );
  appendPre('Autoriserer…');
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
  gapi.client.drive.files.list({
    "q": "fullText contains '"+version.key+"'"
  }).execute(function(resp) {
    if (!resp.error) {
      spreadsheetId = getID(resp.items);
      if (spreadsheetId) loadSheetsApi(fetchAndOutputData);
    } else if (resp.error.code == 401) {
      // Access token might have expired.
      checkAuth();
    } else {
      appendPre('En feil oppsto: ' + resp.error.message);
    }
  });
}

/**
* Check if current user has authorized this application.
*/
function checkAuth() {
  gapi.auth.authorize({
    'client_id': CLIENT_ID,
    'scope': SCOPES.join(' '),
    'immediate': true
  }, handleAuthResult);
}

/**
* Find ID of the right file or create a file if none exist and return ID
*
* @param {array} items Array of documents in user's Drive that match the search query
*/
function getID(items) {
  for (var i = 0; i < items.length; i++) { // Loop through items and search for match
    if (items[i].mimeType == "application/vnd.google-apps.spreadsheet" && !items[i].labels.trashed) {
      return items[i].id; // Return ID of matching spreadsheet
    }
  }
  appendPre('Oppretter regneark…'); // Create new file if no matches were found
  copyFile();
}

/**
* Load Sheets API client library.
*
* @param {function()} callback Function to execute after loading API.
*/
function loadSheetsApi(callback) {
  appendPre('Laster inn flere viktige filer…');
  gapi.client.load('https://sheets.googleapis.com/$discovery/rest?version=v4').then(callback);
}

/**
* Fetch and print the data
*/
function fetchAndOutputData() {
  appendPre('Laster inn plusstimer…');
  if (typeof spreadsheetId === 'string' && spreadsheetId.length > 5) { // Validate the spreadsheetId variable
    gapi.client.sheets.spreadsheets.values.get({  // Get the range of cells from the spreadsheet
      spreadsheetId: spreadsheetId,
      range: version.range
    }).then(function(response) {  // Handle successful response
      appendPre('Lasting fullført.');
      let range = response.result;
      if (range.values.length > 0) { // Validate response and print result
        days = range.values[version.days[0]][version.days[1]];
        hours = range.values[version.hours[0]][version.hours[1]];
        appendPre(range.values[version.plusstimer[0]][version.plusstimer[1]] + 'plusstimer');
        q('#result>.number').innerHTML = Number(range.values[0][3]);
        q('#result').style.display = 'block';
        q('#caption').style.display = 'block';
        q('#caption>a').innerText = "Jeg har ikke "+days+" dager og "+hours+" timer fravær. Oppdater";
        q('#output').style.display = 'none';
      } else { // Handle unsuccessful validation of response
        appendPre('Fant ingen data.');
      }
      if (firstVisit) updateSheet();
    }, function(response) { // Handle erroneous response
      appendPre('Feil: ' + response.result.error.message);
    });
  } else {  // Handle unsuccessful validation of the spreadsheetId variable (this should never happen, but the user should get an explanation if it does)
    appendPre('Something went wrong, refresh the page and try again');
  }
}

/**
* Copy a spreadsheet file because no existing file was found
*/
function copyFile() {
  if (compatible_versions.length) { // Check if any older, but compatible, versions of the current spreadsheet exists
    copyDataFromOldSheet();
  }
  gapi.client.drive.files.copy({
    'fileId': version.template,
    'resource': {'title': version.title}
  }).execute(function(resp) {
    spreadsheetId = resp.id;
    loadSheetsApi(fetchAndOutputData);
    firstVisit = true;
  });
}

/**
* Get data from old compatible spreadsheet and insert it into the new one
*/
function copyDataFromOldSheet () {
  appendPre('Prøver å finne et gammelt regneark…');
  gapi.client.drive.files.list({ // Query user's Drive
    "q": "fullText contains '"+compatible_versions[0].key+"'"
  }).execute(function(resp) { // Handle response
    if (!resp.error) { // Stop if an error occurs, but just ignore it because it is not impotant
      let items = resp.items;
      for (var i = 0; i < items.length; i++) {
        if (items[i].mimeType == "application/vnd.google-apps.spreadsheet" && !items[i].labels.trashed) {
          appendPre('Fant et gammelt regneark');
          let oldSheetId = items[i].id;
          loadSheetsApi(()=>{ // Load sheets api
            gapi.client.sheets.spreadsheets.values.get({ // Get amount of days abscence
              spreadsheetId: oldSheetId,
              range: compatible_versions[0].days,
            }).then(function(response) {
              let days = response.result.values[0][0]; // Save response
              gapi.client.sheets.spreadsheets.values.get({ // Get amount of hours abscence
                spreadsheetId: oldSheetId,
                range: compatible_versions[0].hours,
              }).then(function(response) {
                let hours = response.result.values[0][0]; // Save response
                updateSheet(days, hours, true); // Update the new sheet with the variables from the old sheet
                trashFile(oldSheetId); // Move the old file to the trash
              });
            });
          });
        }
      }
    }
  });
}

/**
 * Move a file to the trash.
 *
 * @param {String} fileId ID of the file to trash.
 */
function trashFile(fileId) {
  appendPre("Flytter gammelt regneark til papirkurven…");
  gapi.client.drive.files.trash({
    'fileId': fileId
  }).execute(function(resp) { });
}

/*
* Update spreadsheet
*
* @param {string|number|undefined} preset_days Prompt can be skipped if this parameter is defined
* @param {string|number|undefined} preset_hours Prompt can be skipped if this parameter is defined
* @param {boolean|undefined} skip_conf Whether or not confirmation should be skipped
*/
let days, hours;
function updateSheet(preset_days, preset_hours, skip_conf) {
  q('pre').innerHTML = ""
  days = preset_days || prompt('Hvor mange hele DAGER fravær har du på skolearena?\nf.eks. 2', days);
  hours = preset_hours || prompt('Hvor mange TIMER fravær har du på skolearena?\nf.eks. 23,75', hours);
  confirmed = confirm("Er dette riktig informasjon?:\nDager: "+days+"\nTimer: "+hours);
  if ((typeof skip_conf !== "undefined" && skip_conf) || (days && hours && confirmed)) {
    q('#output').style.display = 'block';
    firstVisit = false;
    values = [];
    values[version.days[0]] = [];
    values[version.hours[0]] = [];
    values[version.days[0]][version.days[1]] = days;
    values[version.hours[0]][version.hours[1]] = hours;
    appendPre('Oppdaterer fravær…');
    gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: version.range,
      valueInputOption: 'USER_ENTERED',
      values: values
    }).then(function (resp) {
      appendPre('Fravær er oppdatert, laster inn plusstimer på nytt…');
      fetchAndOutputData();
    })
  } else if (days && hours && !confirmed) {
    updateSheet(preset_days, preset_hours, skip_conf);
  }
}

/**
* Append text to the pre element containing the given message.
*
* @param {string} message Text to be placed in pre element.
*/
function appendPre(message) {
  let textContent = document.createTextNode(message + '\n');
  document.getElementById('output').appendChild(textContent);
}
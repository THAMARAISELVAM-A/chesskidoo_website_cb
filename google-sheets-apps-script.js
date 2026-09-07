/**
 * ==============================================================================
 * CHESSKIDOO ACADEMY — GOOGLE APPS SCRIPT FOR DEMO CLASS BOOKINGS
 * ==============================================================================
 * Target Spreadsheet:
 * https://docs.google.com/spreadsheets/d/1AG6Mvpctz6TFzCRGa1-6Qz0V1cl0NDI-QqxINHPn5mU/edit?usp=sharing
 *
 * HOW TO DEPLOY IN 2 MINUTES:
 * 1. Open the Google Spreadsheet above.
 * 2. In the top menu, click: Extensions > Apps Script.
 * 3. Delete any code in the editor, and PASTE this entire file.
 * 4. Click "Save" (Floppy disk icon).
 * 5. Click the blue "Deploy" button (top right) > "New deployment".
 * 6. Click the Gear icon ⚙️ next to "Select type" > select "Web app".
 * 7. Set configuration:
 *    - Description: ChessKidoo Demo Class Booking Webhook
 *    - Execute as: "Me" (your Google account)
 *    - Who has access: "Anyone" (essential so the website can submit bookings)
 * 8. Click "Deploy", and authorize access when prompted.
 * 9. Copy the generated "Web app URL" (e.g. https://script.google.com/macros/s/AKfycb.../exec).
 * 10. Paste that Web app URL into assets/js/config.js as GOOGLE_SHEET_WEBHOOK_URL
 *     and into Vercel Environment Variables as GOOGLE_SHEET_WEBHOOK_URL.
 * ==============================================================================
 */

var SPREADSHEET_ID = "1AG6Mvpctz6TFzCRGa1-6Qz0V1cl0NDI-QqxINHPn5mU";

function getTargetSheet() {
  var ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}
  if (!ss) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  var sheet = ss.getSheetByName("Demo Bookings") || ss.getActiveSheet();
  
  // Format Header row if sheet is fresh/empty
  if (sheet.getLastRow() === 0) {
    var headers = [
      "Timestamp",
      "Parent Name",
      "Phone Number",
      "Child Details / Age",
      "City / Country",
      "Skill Level",
      "Preferred Mode",
      "Time Slot",
      "Preferred Language",
      "Notes / Summary",
      "Status"
    ];
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#0f172a");
    headerRange.setFontColor("#f59e0b");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
  return sheet;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = getTargetSheet();
    var data = {};

    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var timestamp = data.timestamp || Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy HH:mm:ss");
    var parentName = data.parentName || data.name || "";
    var phone = data.phone || "";
    var childDetails = data.childDetails || data.childAge || data.age || "";
    var city = data.city || "";
    var level = data.level || "Beginner";
    var mode = data.mode || "Online Class";
    var slot = data.slot || "Evening (5 PM - 8 PM)";
    var language = data.language || "English";
    var notes = data.notes || "";
    var status = data.status || "New Lead";

    sheet.appendRow([
      timestamp,
      parentName,
      phone,
      childDetails,
      city,
      level,
      mode,
      slot,
      language,
      notes,
      status
    ]);

    var lastRow = sheet.getLastRow();
    // Highlight new row with alternating clean style
    var rowRange = sheet.getRange(lastRow, 1, 1, 11);
    rowRange.setFontFamily("Roboto");
    rowRange.setFontSize(10);
    rowRange.setVerticalAlignment("middle");

    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      row: lastRow,
      timestamp: timestamp,
      message: "Demo booking saved to Google Sheet"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "ChessKidoo Demo Booking Google Sheets Service",
    spreadsheetId: SPREADSHEET_ID,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("./../../google-credentials.json"); // your downloaded JSON file
const { JWT } = require("google-auth-library");

const SHEET_ID = "https://docs.google.com/spreadsheets/d/1aqK9ihUayK4VdZnvB5YfiWLt5hYOq9075OsM9vwVMXc/edit?usp=sharing"; // from sheet URL

async function addBooking(booking) {

    const spreadsheet = new GoogleSpreadsheet(SHEET_ID); // Get this from your Sheet's URL

    console.log(spreadsheet);
    // // Init doc
    await spreadsheet.loadInfo();
    const sheet = spreadsheet.sheetsByIndex[0]; // first sheet
    // await sheet.addRow({
    //     Name: booking.name,
    //     Email: booking.email,
    //     Phone: booking.phone,
    //     Pass: booking.pass,
    //     Quantity: booking.quantity,
    //     Total: booking.total,
    //     Date: new Date().toLocaleString(),
    // });
    console.log(sheet);
    // console.log("✅ Booking added to Google Sheet!");
}

module.exports = { addBooking };

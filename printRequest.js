const Table = require("cli-table3");

// Initialize the table outside the function
const table = new Table({
  head: ["No", "Origin", "Request", "Fetched From"],
  style: {
    head: [{ "text-align": "center" }],
    border: [],
  },
  colWidths: [6, 21, 25, 17],
});

async function requests(requests) {
  const request = Array(requests);
  if (request.length === 0) {
    console.log(table.toString());
  } else {
    table.push(request);
    console.log(table.toString());
  }
}

module.exports = requests;

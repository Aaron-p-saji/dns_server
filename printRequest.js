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
  table.push(requests);
  console.log(table.toString());
}

module.exports = requests;

const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: "us-east-1" });

const { customAlphabet } = require("nanoid");
const csv = require('csv-parser');
const csvToJ = require('csvtojson');
const fs = require('fs');
const parent = "D:/infville/data";
const folders = ["images-1", "images-2", "images-core"];
let rc = 0;
let MAX_RC = 10;
const results = [];

const alphabet = "0123456789";
const idSize = 16;
const nanoid = customAlphabet(alphabet, idSize);

  // let recs = [];
  (async () => {
    var filePath = "D:/infville/data/consolidated/";
    var items = JSON.parse(fs.readFileSync(filePath + "consolidated.json"));

    let header = "id,upc,prodCategory,prodMajor,prodFullName,size,uom";
    let csv = items.map(row => { return row["id"] + ",\"" + row["upc"] + "\"," + row["prodCategory"] + "," +row["prodMajor"] + "," + row["prodFullName"] + "," + row["size"] + "," + row["uom"]});
    csv = csv.join(',\n');
    
    csv = header + "\n " + csv + "\n";
    fs.writeFile(filePath+"cleanList.csv", csv,(err) => { if (err) throw err;});


  }
)();


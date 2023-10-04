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

const writeToDB = (recs) => {
  let reqs = [];

  for (let i = 0; i < recs.length; i++) {
    let rec = recs[i];
    let req = {
      "PutRequest": {
        "Item": rec
      }
    };
    reqs.push(req);
    if (reqs.length == 20) {
      console.log(reqs[0]);
      const parms = {
        RequestItems: {
          "spirits-sit-Product": reqs
        }
      }
      dynamodb.batchWrite(parms).promise().catch((err) => console.log(err));
      reqs = [];
    }
  }

  // final batch
  const parms = {
    RequestItems: {
      "spirits-sit-Product": reqs
    }
  }
  dynamodb.batchWrite(parms).promise().catch((err) => console.log(err));
  reqs = [];

}

  // let recs = [];
  (async () => {
    var filePath = "D:/infville/data/";
    var recs = JSON.parse(fs.readFileSync(filePath + "WineMapped.json"));
    writeToDB(recs);

  }
)();


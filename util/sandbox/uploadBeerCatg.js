const AWS = require("aws-sdk");
const { customAlphabet } = require("nanoid");
const csv = require('csv-parser');
const fs = require('fs');
let rc = 0;
let MAX_RC = 10;
const results = {};

const alphabet = "0123456789";
const idSize = 16;
const nanoid = customAlphabet(alphabet, idSize);
const dynamodb = new AWS.DynamoDB.DocumentClient({region:"us-east-1"});

fs.createReadStream('D:/infville/data/working-beer/working-beer.csv')
  .pipe(csv())
  .on('data', (data) => {
    rc++;
    let codeValue = data["NACS_Major"] + "_" + data["NACS_Minor"] + "_" + data["Country"]; 
    results[codeValue]=codeValue;

    codeValue = data["NACS_Major"] + "_" + data["NACS_Minor"] ;
    results[codeValue]=codeValue;

    codeValue = data["NACS_Major"] ;
    results[codeValue]=codeValue;
  })
  .on('end', () => {
    writeToDB(results);
    console.log("ALL DONE. INSERTED:" + rc);
  });


const writeToDB = (recsIn) => { 
  let recs = Object.values(recsIn);
  let reqs = [];
    rc = 0;
    for(let i=0;i<recs.length;i++){
      let rec = recs[i];
      let req = {
        "PutRequest": {
          "Item":{}
        }
      } 
      let newRec = req["PutRequest"]["Item"];

      newRec["codeType"] = "CATG";
      newRec["codeValue"] = rec;
      let l = rec.split("_");
      if(l.length==1){
    //  Only Major category
        newRec["codeName"]  =  l[0];
        newRec["codeAddlAttr"]  =  ["country", "abv"];
      }
      newRec["createdAt"] = new Date().toISOString();
      newRec["createdBy"] = "upload" ;
      console.log(newRec);
      reqs.push(req);
    
    const parms = {
      RequestItems:{
        "spirits-dev2-Category":reqs
      }
    }
     dynamodb.batchWrite(parms).promise().catch((err) => console.log(err));
    reqs.length = 0; 
  }
    // await dynamodb .batchWrite(parms) .promise() .catch((err) => console.log(err));
  // console.log(reqs);
}
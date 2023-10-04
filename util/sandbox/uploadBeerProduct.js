const AWS = require("aws-sdk");
const { customAlphabet } = require("nanoid");
const csv = require('csv-parser');
const fs = require('fs');
let rc = 0;
let MAX_RC = 10;
const results = [];

const alphabet = "0123456789";
const idSize = 16;
const nanoid = customAlphabet(alphabet, idSize);
const dynamodb = new AWS.DynamoDB.DocumentClient({region:"us-east-1"});

fs.createReadStream('D:/infville/data/working-beer/working-beer.csv')
  .pipe(csv())
  .on('data', (data) => {
    results.push(data);
    rc++;
    if(rc>=MAX_RC){
      writeToDB(results);
      results.length = 0;
      rc =0;
    }

  })
  .on('end', () => {
    writeToDB(results);
    // console.log(results[0]);
  //  console.log(results[1]['Lowest Selling Price'])
  });

//console.log("ALL DONE. INSERTED:" + rc);

const writeToDB = (recs) => { 
  let reqs = [];

    for(let i=0;i<recs.length;i++){
      let rec = recs[i];
      let req = {
        "PutRequest": {
          "Item":{}
        }
      } ;
      let newRec = req["PutRequest"]["Item"];
      if(rec["UPC_A"]){
         newRec["id"] = "UA_" + rec["UPC_A"];
         newRec["upc"] = rec["UPC_A"];
         newRec["upcType"] = "UPC_A";
      }else if(rec["UPC_E"]){
        // console.log(rec["UPC_E"]);
         newRec["id"] = "UE_" + rec["UPC_E"];
         newRec["upc"] = rec["UPC_E"];
         newRec["upcType"] = "UPC_E";
      }else {
         let id = nanoid();
         newRec["id"] = "ID_" + id;
         newRec["upc"] = rec["id"];
         newRec["upcType"] = id;
      }
      newRec["createdAt"] = new Date().toISOString();
      newRec["createdBy"] = "upload" ;
      newRec["prodCategory"] = rec["NACS_Major"];
      newRec["prodMajor"] = rec["NACS_Minor"];
      newRec["prodMinor"]  = rec["Country"];
      newRec["prodCategoryRef"] = "CATG_" + rec["NACS_Major"] + "_" + rec["NACS_Minor"] + "_" + rec["Country"];
      newRec["manufacturer"]  = rec["Manufacturer"];
      newRec["brandLine"] = rec["Brand_Line"];
      newRec["prodName"] = rec["Name"];
      newRec["prodFullName"] = rec["POS_Name"];
      newRec["size"] = rec["Size"];
      newRec["uom"] = rec["UOM"];
      newRec["country"] = rec["Country"];
      if(rec["ABV"]){
        newRec["abv"] = rec["ABV"];
      }
      //req["PutRequest"]["Item"] = newRec;
      reqs.push(req);
    }
    const parms = {
      RequestItems:{
        "spirits-dev2-Product":reqs
      }
    }
    dynamodb.batchWrite(parms).promise().catch((err) => console.log(err));
    // await dynamodb .batchWrite(parms) .promise() .catch((err) => console.log(err));
  // console.log(reqs);
}
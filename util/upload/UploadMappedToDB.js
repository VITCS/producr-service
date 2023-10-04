const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: "us-east-1" });

const { customAlphabet } = require("nanoid");
const csv = require('csv-parser');
const csvToJ = require('csvtojson');
const fs = require('fs');
const { exit } = require("process");
const parent = "D:/infville/data";
const folders = ["images-1", "images-2", "images-core"];
let rc = 0;
let MAX_RC = 10;
const results = [];

const alphabet = "0123456789";
const idSize = 16;
const nanoid = customAlphabet(alphabet, idSize);



/**************************************************************
 * Update Record
 **************************************************************/
 updateProduct = async (body, identity) => {

  const { id } = body.input;
  const newBody = { ...body.input };
  delete newBody.id;
  newBody["updatedAt"] = new Date().toISOString();
  newBody["updatedBy"] = identity.userName;

  let TestUpdateExpression = "";
  let ExpressionAttributeValues = {};
  let i = 0;

  for (let item in newBody) {
    if (i === 0) {
      TestUpdateExpression += `set ${item} = :new${item}, `;
      i++;
    } else TestUpdateExpression += `${item} = :new${item}, `;

    ExpressionAttributeValues[`:new${item}`] = newBody[item];
  }

  const UpdateExpression = TestUpdateExpression.slice(0, -2);

  const params = {
    TableName: "spirits-dev-Product",
    Key: {
      id,
    },
    UpdateExpression,
    ExpressionAttributeValues,
    ReturnValues: "UPDATED_NEW",
  };

  try {
    const res = await dynamodb.update(params).promise();
    // console.log(res);
    return {
      id,
      ...res.Attributes,
    };
  } catch (err) {
    console.log("ERROR: ", err);
    throw err;
  }
};



const writeToDB = (recs) => {
  let reqs = [];

  for (let i = 0; i < recs.length; i++) {
    let rec = recs[i];

    let parms = {
      TableName:"spirits-dev-Product",
      "Key":{
        "id": rec.id
      },
      "Item": rec
    }
    updateProduct({"input":rec},{"userName":"UploadUpdate"});
//    console.log(parms);
// //    dynamodb.put(parms).promise().catch((err) => console.log(err));

//     dynamodb.put(parms, function(err, data) {
//       if (err) console.log(err);
//       else console.log(data);
//     });
    // break;
  }

}

  // let recs = [];
  (async () => {
    var filePath = "D:/infville/data/";
    var recs = JSON.parse(fs.readFileSync(filePath + "WineMapped.json"));
    writeToDB(recs);

  }
)();


const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: "us-east-1" });
const { customAlphabet } = require("nanoid");
const fs = require('fs');
const filePath = "./data/";
const alphabet = "0123456789";
const idSize = 16;
const nanoid = customAlphabet(alphabet, idSize);


/**************************************************************
 * Update Record
 **************************************************************/
 updateRec = async (body, identity) => {

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
      TableName: "spirits-sit-Store",
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
  

const loadDummyData = () => {
    let n = 1;

    var recs = JSON.parse(fs.readFileSync(filePath + "StoreDummyData.geojson"));
    var template = JSON.parse(fs.readFileSync(filePath + "StoreDummyTemplate.json"));
    console.log( recs["features"][0]);
    const reqs = recs["features"].map((rec) => {
        let f = rec["properties"];
        let id = nanoid();
        var t = {
            "id": id,
            "storeName": f["SITE_NAME"],
            "address": {
                "addrLine1": f["ADDRESS_LINE_1"],
                "addrLine2": f["ADDRESS_LINE_2"],
                "city": f["CITY"],
                "state": f["STATE_OR_COUNTRY_CODE"],
                "country": "United States",
                "postCode": f["ZIP_CODE"],
                "longitude": rec["geometry"]["coordinates"][0],
                "latitude": rec["geometry"]["coordinates"][1],
                "geoPoint": {
                    "lon": rec["geometry"]["coordinates"][0],
                    "lat": rec["geometry"]["coordinates"][1],
                }
            },
            "storeRefId": f["SITE_ID"],
            ...template
        };
        return t;
    });

    console.log(reqs.length);
    return reqs;
}



(async () => {

    let recs = loadDummyData();
    recs.forEach((rec)=>{
        updateRec({"input":rec},{"userName":"sri001"});
    });
}
)();

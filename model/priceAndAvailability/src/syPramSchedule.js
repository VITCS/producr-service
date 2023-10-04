const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();
const path = require('path');
const Math = require("mathjs");
const axios = require('axios');

const { BUCKET_NAME, STORE_TABLE_NAME, AWS_REGION, SYPRAM_PARM_BASE } = process.env;
var credentials = new AWS.EnvironmentCredentials('AWS');

const ssm = new AWS.SSM({ region: AWS_REGION });

const s3 = new AWS.S3({
  signatureVersion: "v4",
});

const s3KeyPrefix = "StorePnAUpdates/";
/**
 *  Handler to trigger a Scheduled Event to process Sypram Data
 * 
 */

exports.handler = async (event) => {
  if (!event) throw new Error("Event not found");
  console.log("Received event {}", JSON.stringify(event, 3));

  // get List of Stores to process from the Parameter Store
  const keyParams = {
    Name: SYPRAM_PARM_BASE + "/storeList",
    WithDecryption: true,
  };

  const keyParameter = await ssm.getParameter(keyParams).promise();
  const stores = JSON.parse(keyParameter.Parameter.Value).stores;

  try {
    for (let i = 0; i < stores.length; i++) {
      let store = stores[i];
      await processFile(store.storeId, store.url, store.user, store.pass);
    }
  } catch (e) {
    console.log(e);
  }
  const response1 = {
    statusCode: 200,
    body: JSON.stringify({ "Message": "Processed file Successfully" })
  };

  return response1;
};

/* ******************************************************************************
 * Process file for a StoreId
 * ****************************************************************************** */
const processFile = async (storeId, url, user, pass) => {
  console.log("Process File Start");
  let respData = await downloadFile(storeId, url, user, pass);

  let list = convertToStandardFormat(respData.Data);

  console.log("Writing Data to S3");

  const s3UploadParams = {
    Bucket: BUCKET_NAME,
    Key: s3KeyPrefix + storeId,
    Body: JSON.stringify(list)
  };
  let uploadResponse = await s3.upload(s3UploadParams).promise();
  console.log(uploadResponse);
  console.log("Process File End");
}

/* ******************************************************************************
 * Download file from Sypram
 * ****************************************************************************** */
const downloadFile = async (storeId, url, user, pass) => {
  console.log("Downloading Sypram file for Store" + storeId);

  try {
    console.log("Before Downloading the file");
    // Downloading file from Sypram
    const resp = await axios({
      method: "get",
      url: url,
      auth: {
        username: user,
        password: pass
      }
    })
    console.log("After Downloading the file");
    return resp.data;
  } catch (err) {
    console.log(err);
    // TODO Need to send an Alert
  }
};

/* ******************************************************************************
 * Map Record from Sypram format to Platform format
 * ****************************************************************************** */
const mapRecord = (id, rec) => {

  let newRec = {
    "productId": id,
    "upc": rec.UPC,
    "prodName": rec.itemName,
    "price": rec.Price,
    "salePrice": rec.SALEPRICE,
    "priceA": rec.PriceA,
    "priceB": rec.priceB,
    "priceC": rec.priceC,
    "totalQty": rec.TotalQty,
    "altUPC1": rec.ALTUPC1,
    "altUPC2": rec.ALTUPC2,
    "storeCode": rec.STORECODE
  };
  return newRec;
}

/* ******************************************************************************
 * Convert records to Platform Format
 * ****************************************************************************** */
const convertToStandardFormat = (recList) => {
  console.log("Converting to Standard Format");

  const m1 = new Map();

  let list = [];
  recList.forEach(element => {
    let l = element.UPC.length;
    if (l == 6) {
      let id = "UE_" + element.UPC;
      list.push(mapRecord(id, element));
    } else if (l == 12) {
      let id = "UA_" + element.UPC;
      list.push(mapRecord(id, element));
    }

    let t = m1.get(l);
    if (t) {
      m1.set(l, t + 1);
    } else {
      m1.set(l, 1);
    }

  });
  console.log("Total Records: " + recList.length);
  return list;
}

/* ******************************************************************************
 * Download file from S3
 * @param {String} attachmentId the attachment id
 * @return {Promise} promise resolved to downloaded data
 * ****************************************************************************** */
async function downloadFromS3(bucket, key) {
  const file = await s3.getObject({ Bucket: bucket, Key: key }).promise()
  return {
    data: file.Body.toString('utf-8'),
    mimetype: file.ContentType
  }
}

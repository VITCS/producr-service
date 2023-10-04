const fs = require('fs');
const axios = require('axios');
const AWS = require("aws-sdk");
AWS.config.update({ "region": "us-east-1" });
const ssm = new AWS.SSM();
const s3 = new AWS.S3({
  signatureVersion: "v4",
});
const SYPRAM_PARM_BASE = "/spirits/dev/syprams/";

/**************************************************************
 * Main Handler
 **************************************************************/
exports.handler = async function (event, context, callback) {
  /*
   if (!event) throw new Error("Event not found");
   let response;
   console.log("Received event {}", JSON.stringify(event, 3));
   try {
     switch (event.field) {
       case "searchAddress":
         response = await searchAddress(event.body);
         break;
     }
   } catch (e) {
     console.error("Error Occured", e);
   }
   return response;
*/
  let storeId = "0334021613087480";
  downloadFile(storeId);


};


/*
const recs = [];
(async () => {

    const m1 = new Map();

    var filePath = "./";
    var response = JSON.parse(fs.readFileSync(filePath + "ItemListresponse.json"));
    response.Data.forEach(element => {
        let n = element.UPC.length;
        let t = m1.get(n)
        if(t){
            m1.set(n,t+1);
        }else{
            m1.set(n,1);
        }
        if(n==13){
            console.log(element.UPC);
        }
    });
    console.log(m1);
})();
*/



/*
*
*/
const downloadFile = async (storeId) => {
  console.log("Downloading Sypram file for Store");

  try {
    const keyParams = {
      Name: SYPRAM_PARM_BASE + storeId,
      WithDecryption: true,
    };

    const keyParameter = await ssm.getParameter(keyParams).promise();
    const key = JSON.parse(keyParameter.Parameter.Value);

    let sypramURL = key.url;
    let sypramUser = key.user;
    let sypramPass = key.pass;

    // Downloading file from Sypram
    const resp = await axios({
      method: "get",
      url: sypramURL,
      auth: {
        username: sypramUser,
        password: sypramPass
      }
    })

    let data = JSON.stringify(resp.data);
    return data;
  } catch (err) {
    console.log(err);
    // TODO Need to send an Alert
  }
};

const mapRecord = (id, rec) =>{

  let newRec = {
    "productId" : id,
    "upc" : rec.UPC,
    "prodName": rec.itemName,
    "price": rec.Price,
    "salePrice": rec.SALEPRICE,
    "priceA" : rec.PriceA,
    "priceB" : rec.priceB,
    "priceC" : rec.priceC,
    "totalQty": rec.TotalQty,
    "altUPC1" : rec.ALTUPC1,
    "altUPC2" : rec.ALTUPC2,
    "storeCode" : rec.STORECODE
  };
  return newRec;
} 

const convertToStandardFormat = (recList) => {

  const m1 = new Map();

  let list = [];
  recList.forEach(element => {
    let l = element.UPC.length;
    if (l == 6) {
       let id = "UE_"+element.UPC;
       list.push(mapRecord(id,element));
    }else if (l==12){
      let id = "UA_"+element.UPC;
      list.push(mapRecord(id,element));
    }

    let t = m1.get(l);
    if(t){
        m1.set(l,t+1);
    }else{
        m1.set(l,1);
    }

  });
  console.log("Total Records: " + recList.length);
  console.log(m1);
  return list;
}

/**
 * Download file from S3
 * @param {String} attachmentId the attachment id
 * @return {Promise} promise resolved to downloaded data
 */
 async function downloadFromS3 (bucket, key) {
  const file = await s3.getObject({ Bucket: bucket, Key: key }).promise()
  return {
   data: file.Body.toString('utf-8'),
   mimetype: file.ContentType
  }
 }


(async () => {
  let storeId = "0334021613087480";
  let filePath = "D:/temp/sypramLoad.json";
  // let data = await downloadFile(storeId);
  // fs.writeFileSync(filePath, data);

  // let recList = JSON.parse(fs.readFileSync(filePath));
  // let list = convertToStandardFormat(recList.Data);
  // let processedFilePath = "D:/temp/sypramLoadParsed.json";
  // fs.writeFileSync(processedFilePath,JSON.stringify(list));


  let fd = await downloadFromS3("843219620739-spirits-dev-merchantupdates","upload/5135278955702092/0334021613087480/prodavailabiliydata.csv");
//  let jsonObj = fd.toString('utf-8');
  console.log(fd);

})();
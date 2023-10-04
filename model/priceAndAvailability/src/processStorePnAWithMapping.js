const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();
const fastcsv = require("fast-csv");;
const path = require('path');
const HashMap = require('hashmap');
const Math=require("mathjs");

const { ES_REGION, ELASTICSEARCH_DOMAIN ,ES_ENDPOINT, ES_INDEX_NAME } = process.env;
const endpoint = new AWS.Endpoint(ELASTICSEARCH_DOMAIN);
const httpClient = new AWS.HttpClient();
const httpMethod = 'POST';
const httpMethodBulk = 'POST _bulk';
const requestPath = encodeURI("/"+ES_INDEX_NAME + '/_bulk');
var credentials = new AWS.EnvironmentCredentials('AWS');

let storeId;
let merchantAccountId;
const DOC_TYPE = '_doc'

    
const s3 = new AWS.S3({
    signatureVersion: "v4",
});
/*
    Main Handler for the Trigger
*/
exports.handler = async (event) => {
    if (!event) throw new Error("Event not found");
    let response;
    console.log("Received event {}", JSON.stringify(event, 3));

    const bucketName = event.Records[0].s3.bucket.name;
    //Get object key from event
    const key = decodeURIComponent(
        event.Records[0].s3.object.key.replace(/\+/g, " ")
    );
    const eventName = event.Records[0].eventName;
    let objectKey = key.split("\/");
    
    var fileName;
    var prefix;
    if (objectKey.length > 1) {
        prefix = objectKey[0];
        merchantAccountId = objectKey[1];
        storeId = objectKey[2];
        fileName  = key.split("\/")[3];
    }

    if( prefix != "upload"){
        //only process if file iS in upload
        console.log(' not processing:', prefix);
        return;
    }
    if (bucketName != process.env.BUCKET_NAME) {
        console.error("Wrong bucket", bucketName);
        return;
    }

    //Get latitude and longitude for that store
    var paramsStore = {
        TableName: process.env.STORE_TABLE_NAME,
        Key: {
            id: storeId
        },
    };
    const store = await dynamodb.get(paramsStore).promise();

    //get product Mapping data
    var mappingKey = "productmappings/" + merchantAccountId + "/" + storeId + "/productmappings.csv";
    var getMappingParams = { Bucket: bucketName, Key: mappingKey }
    var map = new HashMap();
    
    const s3MappingStream = s3.getObject(getMappingParams).createReadStream();
    var getParams = { Bucket: bucketName, Key: key };
    const s3Stream = s3.getObject(getParams).createReadStream();
    let results= [];
    
    let mappingParserFcn = new Promise((resolve, reject) => {
    const parser = fastcsv
      .parseStream(s3MappingStream, { headers: true })
      .on("data", function (data) {
          map.set(data.UPC, data.ProductId);
      })
      .on("end", function () {
        resolve("csv parse process finished for mapping file");
      })
      .on("error", function () {
        reject("csv parse process failed for mapping file");
      });
  });

  try {
    await mappingParserFcn;
  
  } catch (error) {
    console.log("Get Error: ", error);
  }
  
   //Now parse the product availability file
     let parserFcn = new Promise((resolve, reject) => {
    const parser = fastcsv
      .parseStream(s3Stream, { headers: true })
      .on("data", function (data) {
          results.push(data);
      })
      .on("end", function () {
        resolve("csv parse process finished");
      })
      .on("error", function () {
        reject("csv parse process failed");
      });
  });
  
  let res
   try {
    await parserFcn;
     var noOfRequests = Math.ceil( results.length / 24);
   
     if( results.length > 24){
         endIndex = results.length-1; 
         for( var i=0; i<noOfRequests; i++){
            startIndex = i*24;
            endIndex = startIndex + 23 ;
            if( endIndex > results.lengh-1) {
                endIndex = results.lengh-1;
            }
            console.log('startIndex', startIndex);
       
            res = await sendBulkRequestHttp(  store, results, map, startIndex, endIndex);
         } 
        
     }else{
         startIndex = 0;
         endIndex = results.length-1;
          res = await sendBulkRequestHttp(  store, results, map, startIndex, endIndex);
     }
     
      
    // const result = moveProcessedFile(bucketName , key , storeId) ;
      
      } catch (error) {
        console.log("Get Error: ", error);
      }

    const response1 = {
        statusCode: 200,
        body: JSON.stringify(res)
    }; 
      
    return response1;
};


moveProcessedFile = async (bucketName, key,  storeId) => {
    //Copy file
    var fileName = key.split("\/")[3];
    var destKey = 'processed/' + merchantAccountId + "/"+ storeId + "/" + fileName;

    var copyParams = {
        Bucket: bucketName,
        CopySource: bucketName + '/' + key,
        Key: destKey
    };

    var result = await s3.copyObject(copyParams).promise();

    var deleteParams = {
        Bucket: bucketName, /* required */
        Delete: {
            Objects: [
                { Key: key }
            ]
        }
    };

    result = s3.deleteObjects(deleteParams, function (err, data) {
        if (err) console.log(err, err.stack);
        else console.log("Response:", data);
    }).promise();

    return result;
}


sendBulkRequestHttp = async (  store, records, map, startIndex, endIndex) => {

   const request = new AWS.HttpRequest(endpoint, ES_REGION);
    request.method = httpMethod;
    request.path = path.join(request.path, requestPath);
    request.headers['Content-Type'] = 'application/json';
    request.headers['Host'] = ELASTICSEARCH_DOMAIN;
    
    var geoPoint = new Object();
    geoPoint.lon = store.Item.address.longitude;
    geoPoint.lat = store.Item.address.latitude;
    var priceandavailability;
    let payload;
    let bulk = [] ;
    let id;
    var indexData;
    var index;

    for( i=startIndex; i<= endIndex; i++)
    { 
        let record = records[i];
        if(!record){
            console.log("NO a Record for index" + i);
            continue;
        }
        let productId = map.get(record.UPC);
        if(!productId){
            console.log("NO Product ID");
            console.log(record);
        }

        priceandavailability= new Object();
        priceandavailability.merchantAccountId = merchantAccountId;
        priceandavailability.storeId = store.Item.id;

        priceandavailability.id = productId;
        priceandavailability.price = record.Price;
        priceandavailability.availableQty = record.AvailableQty;
        priceandavailability.storeCoord = geoPoint;
        priceandavailability.isAvailableForOnline = true;
        id = store.Item.id+":" + productId;
        
        indexData = new Object();
        index = new Object();
        index._id=id;
        index._type=DOC_TYPE;
        indexData.index= index;
        bulk.push(JSON.stringify(indexData));
        bulk.push("\n");
        bulk.push(JSON.stringify(priceandavailability));
        bulk.push("\n");
       
    }
    payload = bulk.join('');
 
    request.body = payload;
    request.headers['Content-Length'] = Buffer.byteLength(request.body) ;
    const signer = new AWS.Signers.V4(request, 'es');
    signer.addAuthorization(credentials, new Date());
    console.log("Sending ES Update");
    console.log( payload);
    return new Promise((resolve, reject) => {
        httpClient.handleRequest(request, null,
            response => {
                const { statusCode, statusMessage, headers } = response;
                let body = '';
                response.on('data', chunk => {
                    body += chunk;
                });
                response.on('end', () => {
                    const data = {
                        statusCode,
                        statusMessage,
                        headers
                    };
                    if (body) {
                        data.body = JSON.parse(body);
                    }
                    console.log(body.items);

                    resolve(data);
                });
            },
            err => {
                console.log(err);
                reject(err);
            });
    });

}



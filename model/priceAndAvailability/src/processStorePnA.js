const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();
const path = require('path');
const Math = require("mathjs");

const { ES_REGION, ELASTICSEARCH_DOMAIN, ES_ENDPOINT, ES_INDEX_NAME } = process.env;
const endpoint = new AWS.Endpoint(ELASTICSEARCH_DOMAIN);
const httpClient = new AWS.HttpClient();
const httpMethod = 'POST';
const httpMethodBulk = 'POST _bulk';
const requestPath = encodeURI("/" + ES_INDEX_NAME + '/_bulk');
var credentials = new AWS.EnvironmentCredentials('AWS');

const DOC_TYPE = '_doc'
const s3KeyPrefix = "StorePnAUpdates";


const s3 = new AWS.S3({
    signatureVersion: "v4",
});

/**
 * Download file from S3
 * @param {String} attachmentId the attachment id
 * @return {Promise} promise resolved to downloaded data
 */
async function downloadFromS3(bucket, key) {
    const file = await s3.getObject({ Bucket: bucket, Key: key }).promise()
    return file.Body.toString('utf-8');
}
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
    var storeId;
    if (objectKey.length > 1) {
        prefix = objectKey[0];
        storeId = objectKey[1];
        fileName = key.split("\/")[3];
    }


    if (prefix != s3KeyPrefix) {
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

    console.log(store);
    // Read JSON the Input file
    var getParams = { Bucket: bucketName, Key: key };

    var pnaDataStr = await downloadFromS3(bucketName,key);
    console.log(pnaDataStr);
    var results = JSON.parse(pnaDataStr);
    console.log("Received " + results.length + " for the Store" + storeId);
    console.log("Sending files to ES");
    /**
     * The records have been fetched from the S3 file and ready to process.
     * The requests will need to be batched up.
     * Elastic Search client only allows 24 records per request,  So the records will be split
     * into batch of 24 records and sent. 
     */
    let res, startIndex, endIndex;
    try {
        var noOfRequests = Math.ceil(results.length / 24);

        if (results.length > 24) {
            endIndex = results.length - 1;
            for (var i = 0; i < noOfRequests; i++) {
                startIndex = i * 24;
                endIndex = startIndex + 23;
                if (endIndex > results.lengh - 1) {
                    endIndex = results.lengh - 1;
                }
                console.log('startIndex', startIndex);

                res = await sendBulkRequestHttp(store, results, startIndex, endIndex);
            }

        } else {
            startIndex = 0;
            endIndex = results.length - 1;
            res = await sendBulkRequestHttp(store, results, startIndex, endIndex);
        }

        // TODO moving file has been commented out for now
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

/**
 * Move Processed file to a different Bucket.
 * Currently not being used.  Will be used in future if we want to save all the files after processing.
 */
const moveProcessedFile = async (bucketName, key, storeId) => {
    //Copy file
    var fileName = key.split("\/")[3];
    var destKey = 'processed/' + storeId + "/" + fileName;

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

/**
 * Send Bulk Request of 24 documents at a time to Elastic Search
 * 
 */
const sendBulkRequestHttp = async (store, records, startIndex, endIndex) => {

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
    let bulk = [];
    let id;
    var indexData;
    var index;

    for (let i = startIndex; i <= endIndex; i++) {
        let record = records[i];
        if (!record) {
            console.log("NO a Record for index" + i);
            continue;
        }
        let productId = record.productId;
        if (!productId) {
            console.log("NO Product ID");
            console.log(record);
        }

        priceandavailability = new Object();
        priceandavailability.storeId = store.Item.id;

        priceandavailability.id = productId;
        priceandavailability.price = record.price;
        priceandavailability.availableQty = record.totalQty;
        priceandavailability.storeCoord = geoPoint;
        priceandavailability.isAvailableForOnline = true;
        id = store.Item.id + ":" + productId;

        indexData = new Object();
        index = new Object();
        index._id = id;
        index._type = DOC_TYPE;
        indexData.index = index;
        bulk.push(JSON.stringify(indexData));
        bulk.push("\n");
        bulk.push(JSON.stringify(priceandavailability));
        bulk.push("\n");

    }
    payload = bulk.join('');

    request.body = payload;
    request.headers['Content-Length'] = Buffer.byteLength(request.body);
    const signer = new AWS.Signers.V4(request, 'es');
    signer.addAuthorization(credentials, new Date());
    console.log("Sending ES Update");
    console.log(payload);
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

const AWS = require("aws-sdk");

/**************************************************************
 * Main Handler
 **************************************************************/
exports.handler = async function (event, context, callback) {
  if (!event) throw new Error("Event not found");
  let response;
  console.log("Received event {}", JSON.stringify(event, 3));
  try {
    return await getUploadURL(event);
  } catch (e) {
    console.error("Error Occured", e);
  }
  return response;
};

/**************************************************************
 * S3 Signed URL
 **************************************************************/
 const getUploadURL = async function(event) {
 
  let args = event.body;
  const s3 = new AWS.S3({
    signatureVersion: 'v4'
  });

  let Key;
  let bucketName;
  let requestType;
  let s3Params;
  
  if( args.requestType.toLowerCase() == 'put'){
    requestType = 'putObject';
    if( event.body.storeID){
      Key = `upload/${args.merchantAccountId}/${args.storeID}/${args.fileName}`
      bucketName = process.env.STORE_BUCKET_NAME;
    }

    s3Params = {
      Bucket: bucketName,
      Key,
      Expires: 300,
      Metadata: { uploadedBy : event.user },
      ContentType: args.contentType       //'image/jpg'
    }
  }

  const uploadURL = await s3.getSignedUrlPromise(requestType, s3Params)
  
  const response = {
    status: 200,
    signedURL: uploadURL,
    fileName : Key
  }
  console.log( response );
  return response;
}
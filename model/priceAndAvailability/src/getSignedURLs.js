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
 
  console.log("in getuploadurl");
  let args = event.body;
  let transferAccelaration = false;
/*  if( process.env.ENVIRONMENT.toLowerCase() == 'prod'){
    transferAccelaration = true;
  }*/
  const s3 = new AWS.S3({
    signatureVersion: 'v4'
  });

  let Key;
  let prefix;
  let uploadURL;
  let s3Params;
  let fileName;
  let requestType;
  let Urllist = [];
  let s3Url;
  
  prefix = `upload/${args.merchantAccountId}/${args.storeID}`
  
  //Add user info to metadata

//loop through files list to generate URLs
for (let i = 0; i < args.filesList.length; i++) {

  if( args.requestType.toLowerCase() == 'get'){
      requestType = 'getObject';
      fileName = `${args.filesList[i].fileName}`;
    // Get signed URL from S3
     s3Params = {
      Bucket: process.env.STORE_BUCKET_NAME,
      Key: fileName,
      Expires: 300
    }
    }else if( args.requestType.toLowerCase() == 'put'){
      requestType = 'putObject';
       fileName = `${prefix}/${args.filesList[i].fileName}`;
    // Get signed URL from S3
     s3Params = {
      Bucket: process.env.STORE_BUCKET_NAME,
      Key: fileName,
      Expires: 300,
      Metadata: { uploadedBy : event.user },
      ContentType: args.filesList[i].contentType       //'image/jpg'
    }
    }
    
   
  
  
    uploadURL = await s3.getSignedUrlPromise(requestType, s3Params);

    s3Url = {
      signedURL: uploadURL,
      fileName: args.filesList[i].fileName
    }
    Urllist.push(s3Url);

}

  const response = {
    status: 200,
    items: Urllist,
    
  }
  console.log( response );
  
  return response;
}

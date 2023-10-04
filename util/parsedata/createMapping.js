const AWS = require("aws-sdk");
const csv = require('csv-parser');
const csvToJ = require('csvtojson');
const fs = require('fs');

let masterFile = "./PNAMaster.csv"
let path2 = "./mappings/";

let merchantList =  ["3543940718012490", "3543940718012490", "8051918813939250", "8051918813939250", "6904415156897520", "6904415156897520", "8822266919509760", "8822266919509760", "8224314208178190", "8224314208178190"];
let storeList = ["2095905679428006", "0386566890806019", "4999113666811234", "8910140563338440", "9104653644782133", "2022093318307332", "1322054459674036", "3249307370029358", "3558181984830595", "0385810910115390"];

const readCsv = async (merchant, store) => {
    let items = [];

    let pnaRecs = await csvToJ().fromFile(masterFile);
    let size = pnaRecs.length;
    for (let i =0;i<size;i++) {
        let item = {};
        let rec = pnaRecs[i];
        item["ProductId"] = rec["id"];
        item["UPC"]=rec["id"].substring(3);
        items.push(item);
    }
    // console.log(items);
    const replacer = (key, value) => value === null ? '' : value; // specify how you want to handle null values here
    const header = Object.keys(items[0]);
    let csv = items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
    csv.unshift(header.join(','));
    csv = csv.join('\r\n');

    let dir = path2+"/" + merchant + "/"  + store ;
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, {recursive: true});
    }
    fs.writeFile(dir + "/productmappings.csv", csv,(err) => { if (err) throw err;});

    let parms = {
        params:{
            Bucket: "843219620739-spirits-sit-merchantupdates",
            Key: "productmappings/" + merchant + "/" + store + "/productmappings.csv",
            Body: csv
        }
    }
    var upload =  new AWS.S3.ManagedUpload(parms);
    var promise = upload.promise();
    promise.then(
        function(data){
            console.log("Success");
    }, function(err){
            console.log("ERROR");
            console.log(err);
    });
}




(async () => {
    for(let i=0;i < storeList.length;i++){
        readCsv(merchantList[i], storeList[i]);
    }
}
)();

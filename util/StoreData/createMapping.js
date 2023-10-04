const csv = require('csv-parser');
const csvToJ = require('csvtojson');
const fs = require('fs');

let path1 = "./priceandA/";
let path2 = "./mappings/";

const readCsv = async (file) => {
    let items = [];

    let pnaRecs = await csvToJ().fromFile(path1+file);
    let size = pnaRecs.length;
    console.log(size);
    for (let i =0;i<size;i++) {
        let item = {};
        let rec = pnaRecs[i];
        // console.log(rec);
        let id1 = rec["UPC"];
        let id = rec["UPC"];
        if(id.length<=8){
            id = id.padStart(8, "0");
            item["ProductId"] = "UE_" + id;
        }else{
            id = id.padStart(12, "0");
            item["ProductId"] = "UA_" + id;
        }
        item["UPC"]=id1;
//        item["price"]=Number(rec["price"]);
        items.push(item);
    }
    // console.log(items);
    const replacer = (key, value) => value === null ? '' : value; // specify how you want to handle null values here
    const header = Object.keys(items[0]);
    let csv = items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
    csv.unshift(header.join(','));
    csv = csv.join('\r\n');

    fs.writeFile(path2+file, csv,(err) => { if (err) throw err;});
}




(async () => {
    readCsv("s1.csv");
    readCsv("s2.csv");
    readCsv("s3.csv");
    readCsv("s4.csv");
    readCsv("s5.csv");
    readCsv("s6.csv");
    readCsv("s7.csv");
}
)();

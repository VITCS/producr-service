const csv = require('csv-parser');
const csvToJ = require('csvtojson');
const fs = require('fs');

let path1 = "./priceandA/";
let path2 = "./mappings/";

const readCsv = async (file,priceField,targetFile) => {
    let items = [];
//UPC_E,Stoe1-Price,Stoe2-Price,Stoe3-Price,Stoe4-Price,Stoe4-Price,Stoe5-Price,Stoe6-Price,Stoe7-Price,UPC_A

    let pnaRecs = await csvToJ().fromFile(path1+file);
    let size = pnaRecs.length;
    for (let i =0;i<size;i++) {
        let item = {};
        let rec = pnaRecs[i];
        // console.log(rec);
        let id = rec["UPC_A"];
        if(rec["UPC_A"]){
            id = rec["UPC_A"];
        }else{
            id = rec["UPC_E"];
        }

        item["UPC"]=id;
        item["Price"]=Number(rec[priceField]);
        item["AvailableQty"] = Math.floor(Math.random() * 100); 
        items.push(item);
    }
    // console.log(items);
    const replacer = (key, value) => value === null ? '' : value; // specify how you want to handle null values here
    const header = Object.keys(items[0]);
    let csv = items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
    csv.unshift(header.join(','));
    csv = csv.join('\r\n');

    fs.writeFile(path1+targetFile, csv,(err) => { if (err) throw err;});
}




(async () => {
    readCsv("Storeprices.csv", "Stoe1-Price", "s1.csv");
    readCsv("Storeprices.csv", "Stoe2-Price", "s2.csv");
    readCsv("Storeprices.csv", "Stoe3-Price", "s3.csv");
    readCsv("Storeprices.csv", "Stoe4-Price", "s4.csv");
    readCsv("Storeprices.csv", "Stoe5-Price", "s5.csv");
    readCsv("Storeprices.csv", "Stoe6-Price", "s6.csv");
    readCsv("Storeprices.csv", "Stoe7-Price", "s7.csv");
}
)();

const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: "us-east-1" });

const { customAlphabet } = require("nanoid");
const csv = require('csv-parser');
const csvToJ = require('csvtojson');
const fs = require('fs');
const parent = "D:/infville/data";
const folders = ["raw/images-1", "raw/images-2", "raw/images-core", "raw/more-beer" , "raw/more liquor", "raw/more wine"];
let rc = 0;
let MAX_RC = 10;
const results = [];

const alphabet = "0123456789";
const idSize = 16;
const nanoid = customAlphabet(alphabet, idSize);
const listWithoutDups = () => {

  let list = {};
  folders.forEach(folder => {
    let fld = parent + "/" + folder;
    fs.readdirSync(fld).forEach(file => {
      let fullPath = fld + "/" + file;
      let parts = file.split("_");
      let key = parts[0];
      if (key.length > 12) {
        key = key.slice(key.length - 12);
      }
      list[key] = { "key": key, "name": parts[0], "fullPath": fullPath, "folder": fld, "file": file };
    });
  });
  console.log("# of Unique Images");
  console.log(Object.values(list).length);
  return list;
}

const countWithImages = (recs) => {
  let imgC = 0;
  recs.forEach(rec => {
    if (rec["imageFile"]) {
      imgC = imgC + 1;
    }
  });
  console.log(imgC);
}

const writeToDB = (recs) => {
  let reqs = [];

  for (let i = 0; i < recs.length; i++) {
    let rec = recs[i];
    let req = {
      "PutRequest": {
        "Item": rec
      }
    };
    reqs.push(req);
    if (reqs.length == 20) {
      const parms = {
        RequestItems: {
          "spirits-dev-Product": reqs
        }
      }
      dynamodb.batchWrite(parms).promise().catch((err) => console.log(err));
      reqs = [];
    }
  }

  // final batch
  const parms = {
    RequestItems: {
      "spirits-dev2-Product": reqs
    }
  }
  dynamodb.batchWrite(parms).promise().catch((err) => console.log(err));
  reqs = [];

}

  const writeToDB2 = (items, file) => {
    let filePath = parent + "/" + file + ".json";

    // const replacer = (key, value) => value === null ? '' : value; // specify how you want to handle null values here
    // const header = Object.keys(items[0]);
    // let csv = items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
    // csv.unshift(header.join(','));
    // csv = csv.join('\r\n');


    let csv = items.map(row => JSON.stringify(row));
//    csv.unshift(header.join(','));
    csv = csv.join(',\n');
    csv = "[ \n " + csv + "\n]";


//    fs.unlinkSync(filePath);

    fs.writeFile(filePath, csv,(err) => { if (err) throw err;});
    // var writer = fs.createWriteStream(filePath, {
    //   flags: 'w' // 'a' means appending (old data will be preserved)
    // })

    // writer.write("[\n");

    // items.forEach((item) => {
    //   writer.write(JSON.stringify(item));
    //   writer.write(",\n");
    // });
    // writer.write("]");
    // writer.end();

//    fs.writeFile(filePath, JSON.stringify(items,null, 4),(err) => { if (err) throw err;});


  }

  let recs = [];
  (async () => {

    let images = listWithoutDups();
    let beerRecs = await csvToJ().fromFile('D:/infville/data/working/working-beer.csv');
    let beerMapped = mapBeerData(beerRecs, images);
    recs.push(...beerMapped);
    console.log("BEER COUNT " + recs.length);
    countWithImages(recs);
    writeToDB2(recs, "BeerMapped");

    recs = [];
    let wineRecs = await csvToJ().fromFile('D:/infville/data/working/working-wine.csv');
    let wineMapped = mapWineData(wineRecs, images);
    recs.push(...wineMapped);
    console.log("WINE COUNT " + recs.length);
    countWithImages(recs);
    writeToDB2(recs, "WineMapped");

    recs = [];
    let liquorRecs = await csvToJ().fromFile('D:/infville/data/working/working-liquor.csv');
    let liqourMapped = mapLiquorData(liquorRecs, images);
    recs.push(...liqourMapped);

    console.log("LIQUOR COUNT " + recs.length);
    countWithImages(recs);
    writeToDB2(recs, "LiquorMapped");
    // countWithImages(recs);
  }
)();




const mapBeerData = (recs, images) => {
  let reqs = [];

  for (let i = 0; i < recs.length; i++) {
    let rec = recs[i];
    let newRec = {};
    let id = "";

    // Get Id Field Based on UPC_A or UPC_E
    if (rec["UPC_A"]) {
      id = rec["UPC_A"];
      id = id.padStart(12, "0");
      newRec["id"] = "UA_" + id;
      newRec["upc"] = id;
      newRec["upcType"] = "UPC_A";
    } else if (rec["UPC_E"]) {
      // console.log(rec["UPC_E"]);
      id = rec["UPC_E"];
      id = id.padStart(6, "0");
      newRec["id"] = "UE_" + id;
      newRec["upc"] = id;
      newRec["upcType"] = "UPC_E";
    } else {
      let id = nanoid();
      newRec["id"] = "ID_" + id;
      newRec["upc"] = id;
      newRec["upcType"] = "id";
    }
    // Created At
    newRec["createdAt"] = new Date().toISOString();
    newRec["createdBy"] = "upload";
    // Category
    newRec["prodCategory"] = rec["NACS_Major"];
    newRec["prodMajor"] = rec["NACS_Minor"];
    newRec["prodMinor"] = rec["Country"];
    newRec["prodCategoryRef"] = "CATG_" + rec["NACS_Major"] + "_" + rec["NACS_Minor"] + "_" + rec["Country"];
    // Other details    
    newRec["manufacturer"] = rec["Manufacturer"];
    newRec["brandLine"] = rec["Brand_Line"];
    newRec["prodName"] = rec["Name"];
    newRec["prodFullName"] = rec["POS_Name"];
    newRec["container"] = rec["Container"];
    if (rec["Size"]) {
      newRec["size"] = rec["Size"];
      newRec["uom"] = rec["UOM"];
    } else if (rec["I_Size"]) {
      newRec["size"] = rec["I_Size"];
      newRec["uom"] = rec["I_UOM"];
    }
    if (rec["Carton_UPC"] || rec["Case_UPC"]) {
      newRec["otherUOM"] = [];
      if (rec["Carton_UPC"]) {
        newRec["otherUOM"].push(rec["Carton_UPC"]);
      }
      if (rec["Case_UPC"]) {
        newRec["otherUOM"].push(rec["Case_UPC"]);
      }
    }
    newRec["country"] = rec["Country"];
    if (rec["ABV"]) {
      newRec["abv"] = rec["ABV"];
    }
    //req["PutRequest"]["Item"] = newRec;
    let img = images[newRec["upc"]];
    if (img) {
      newRec["imageFile"] = img["file"];
    }
    reqs.push(newRec);
  }
  return reqs;
}



const mapWineData = (recs, images) => {
  let reqs = [];

  for (let i = 0; i < recs.length; i++) {
    let rec = recs[i];
    let newRec = {};
    let id = "";
    if (rec["UPC_A"]) {
      id = rec["UPC_A"];
      id = id.padStart(12, "0");
      newRec["id"] = "UA_" + id;
      newRec["upc"] = id;
      newRec["upcType"] = "UPC_A";
    } else if (rec["UPC_E"]) {
      // console.log(rec["UPC_E"]);
      id = rec["UPC_E"];
      id = id.padStart(6, "0");
      newRec["id"] = "UE_" + id;
      newRec["upc"] = id;
      newRec["upcType"] = "UPC_E";
    } else {
      let id = nanoid();
      newRec["id"] = "ID_" + id;
      newRec["upc"] = rec["id"];
      newRec["upcType"] = "id";
    }
    newRec["createdAt"] = new Date().toISOString();
    newRec["createdBy"] = "upload";
    newRec["prodCategory"] = rec["NACS_Major"];
    newRec["prodMajor"] = rec["Name"];
    if (rec["Varietal"]) {
      newRec["prodMinor"] = rec["Varietal"];
    } else {
      newRec["prodMinor"] = rec["Name"];
    }
    newRec["prodCategoryRef"] = "CATG_" + newRec["prodCategory"] + "_" + newRec["prodMajor"] + "_" + newRec["prodMinor"];
    newRec["manufacturer"] = rec["Manufacturer"];
    newRec["brandLine"] = rec["Brand_Line"];
    newRec["prodName"] = rec["Brand_Line"] + " " + rec["Varietal"];
    newRec["prodFullName"] = rec["Brand_Line"] + " " + rec["Name"] + " " + rec["Varietal"];
    if (rec["Vintage_Key"]) {
      newRec["vintageKey"] = rec["Vintage_Key"];
    }
    if (rec["Vintage"]) {
      newRec["vintage"] = rec["Vintage"];
    }
    if (rec["Appellation"]) {
      newRec["appellation"] = rec["Appellation"];
    }
   
    newRec["container"] = rec["Container"];
    if (rec["Size"]) {
      newRec["size"] = rec["Size"];
      newRec["uom"] = rec["UOM"];
    } else if (rec["I_Size"]) {
      newRec["size"] = rec["I_Size"];
      newRec["uom"] = rec["I_UOM"];
    }
    if (rec["Carton_UPC"] || rec["Case_UPC"]) {
      newRec["otherUOM"] = [];
      if (rec["Carton_UPC"]) {
        newRec["otherUOM"].push(rec["Carton_UPC"]);
      }
      if (rec["Case_UPC"]) {
        newRec["otherUOM"].push(rec["Case_UPC"]);
      }
    }
    newRec["country"] = rec["Country"];
    if (rec["State"]) {
      newRec["state"] = rec["State"];
    }
    if (rec["ABV"]) {
      newRec["abv"] = rec["ABV"];
    }
    //req["PutRequest"]["Item"] = newRec;
    let img = images[newRec["upc"]];
    if (img) {
      newRec["imageFile"] = img["file"];
    }

    reqs.push(newRec);
  }
  return reqs;
}

const mapLiquorData = (recs, images) => {
  let reqs = [];

  for (let i = 0; i < recs.length; i++) {
    let rec = recs[i];
    let newRec = {};
    let id = "";
    if (rec["UPC_A"]) {
      id = rec["UPC_A"];
      id = id.padStart(12, "0");
      newRec["id"] = "UA_" + id;
      newRec["upc"] = id;
      newRec["upcType"] = "UPC_A";
    } else if (rec["UPC_E"]) {
      // console.log(rec["UPC_E"]);
      id = rec["UPC_E"];
      id = id.padStart(6, "0");
      newRec["id"] = "UE_" + id;
      newRec["upc"] = id;
      newRec["upcType"] = "UPC_E";
    } else {
      let id = nanoid();
      newRec["id"] = "ID_" + id;
      newRec["upc"] = rec["id"];
      newRec["upcType"] = "id";
    }
    newRec["createdAt"] = new Date().toISOString();
    newRec["createdBy"] = "upload";
    newRec["prodCategory"] = rec["NACS_Major"];
    if (rec["Name"].toLowerCase().includes("whiskey")) {
      newRec["prodMajor"] = "Whiskey";
      newRec["prodMinor"] = rec["Name"];
    } else {
      newRec["prodMajor"] = rec["Name"];
      newRec["prodMinor"] = rec["Name"];
    }
    newRec["prodCategoryRef"] = "CATG_" + newRec["prodCategory"] + "_" + newRec["prodMajor"] + "_" + newRec["prodMinor"];
    newRec["manufacturer"] = rec["Manufacturer"];
    newRec["brandLine"] = rec["Brand_Line"];
    newRec["prodName"] = rec["Brand_Line"] + " " + rec["Name"];
    newRec["prodFullName"] = rec["POS_Name"];
    newRec["container"] = rec["Container"];
    if (rec["Size"]) {
      newRec["size"] = rec["Size"];
      newRec["uom"] = rec["UOM"];
    } else if (rec["I_Size"]) {
      newRec["size"] = rec["I_Size"];
      newRec["uom"] = rec["I_UOM"];
    }
    if (rec["Carton_UPC"] || rec["Case_UPC"]) {
      newRec["otherUOM"] = [];
      if (rec["Carton_UPC"]) {
        newRec["otherUOM"].push(rec["Carton_UPC"]);
      }
      if (rec["Case_UPC"]) {
        newRec["otherUOM"].push(rec["Case_UPC"]);
      }
    }
    newRec["country"] = rec["Country"];
    if (rec["State"]) {
      newRec["state"] = rec["State"];
    }
    if (rec["ABV"]) {
      newRec["abv"] = rec["ABV"];
    }
    //req["PutRequest"]["Item"] = newRec;
    let img = images[newRec["upc"]];
    if (img) {
      newRec["imageFile"] = img["file"];
    }

    reqs.push(newRec);
  }
  return reqs;
}

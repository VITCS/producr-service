const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: "us-east-1" });

const { customAlphabet } = require("nanoid");
const csv = require('csv-parser');
const csvToJ = require('csvtojson');
const fs = require('fs');
const parent = "D:/infville/data";
const folders = ["images-1", "images-2", "images-core"];
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
          "spirits-dev2-Product": reqs
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

const recs = [];
(async () => {

  let images = listWithoutDups();
  let beerRecs = await csvToJ().fromFile('D:/infville/data/working/working-beer.csv');
  let beerMapped = mapBeerData(beerRecs, images);
  recs.push(...beerMapped);
  console.log("BEER COUNT " + recs.length);
  countWithImages(recs);

  let wineRecs = await csvToJ().fromFile('D:/infville/data/working/working-wine.csv');
  let wineMapped = mapWineData(wineRecs, images);
  recs.push(...wineMapped);
  console.log("WINE COUNT " + recs.length);
  countWithImages(recs);

  let liquorRecs = await csvToJ().fromFile('D:/infville/data/working/working-liquor.csv');
  let liqourMapped = mapLiquorData(liquorRecs, images);
  recs.push(...liqourMapped);

  console.log("LIQUOR COUNT " + recs.length);
  countWithImages(recs);
  countWithImages(recs);
  writeToDB(recs);

})();




const mapBeerData = (recs, images) => {
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
      newRec["upc"] = id;
      newRec["upcType"] = "id";
    }
    newRec["createdAt"] = new Date().toISOString();
    newRec["createdBy"] = "upload";
    newRec["prodCategory"] = rec["NACS_Major"];
    newRec["prodMajor"] = rec["NACS_Minor"];
    newRec["prodMinor"] = rec["Country"];
    newRec["prodCategoryRef"] = "CATG_" + rec["NACS_Major"] + "_" + rec["NACS_Minor"] + "_" + rec["Country"];
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
      newRec["prodMajor"] = rec["Whiskey"];
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

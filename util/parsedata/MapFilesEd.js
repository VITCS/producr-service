/*
*
*/
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: "us-east-1" });

const { customAlphabet } = require("nanoid");
const csv = require('csv-parser');
const csvToJ = require('csvtojson');
const fs = require('fs');
const { exit } = require("process");
const parent = "D:/infville/data/consolidated";
const folders = ["images"];
let rc = 0;
let MAX_RC = 10;
const results = [];

const alphabet = "0123456789";
const idSize = 16;
const nanoid = customAlphabet(alphabet, idSize);

/* ********************************************************* */
/*  Get List of Images without Duplicates                    */
/* ********************************************************* */
const getImageList = () => {
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

  const writeToDB2 = (items, file) => {
    let csv = items.map(row => JSON.stringify(row));
    csv = csv.join(',\n');
    csv = "[ \n " + csv + "\n]";
    fs.writeFile(parent+"/"+file +".json", csv,(err) => { if (err) throw err;});
    
  }

  let recs = [];
  let dtaRecs = {};
  (async () => {
    let images = getImageList();

    let edRecs =   await csvToJ().fromFile('D:/infville/data/working/ed.csv');
    let mappedEdDta = mapEdData(edRecs,images);
//    console.log("Mapped " + + Object.keys(mappedEdDta).length);

    let beerRecs = await csvToJ().fromFile('D:/infville/data/working/working-beer.csv');
    let beerMapped = mapBeerData(beerRecs, images, mappedEdDta);
    // dtaRecs = {...beerMapped};
//    console.log("BEER COUNT " + Object.keys(beerMapped).length);
    // console.log(dtaRecs[Object.keys(beerMapped)[0]]);

   // countWithImages(recs);
    // writeToDB2(recs, "BeerMapped");

    let wineRecs = await csvToJ().fromFile('D:/infville/data/working/working-wine.csv');
    let wineMapped = mapWineData(wineRecs, images, mappedEdDta);
//    console.log("Wine COUNT " + Object.keys(wineMapped).length);
  //   // countWithImages(recs);
  //   //writeToDB2(recs, "WineMapped");

  //   recs = [];
    let liquorRecs = await csvToJ().fromFile('D:/infville/data/working/working-liquor.csv');
    let liqourMapped = mapLiquorData(liquorRecs, images, mappedEdDta);
//    console.log("Liquor COUNT " + Object.keys(liqourMapped).length);


    dtaRecs = {
      ...beerMapped,
      ...wineMapped,
      ...liqourMapped};

   console.log("Total COUNT " + Object.keys(dtaRecs).length);
  //     let keys = Object.keys(dtaRecs);
  //   console.log("LIQUOR COUNT " + keys.length);

  //   console.log(dtaRecs[keys[0]]);
  //   let edKeys = Object.keys(mappedEdDta);
  //   let mc = 0, m1 = 0;
  //   console.log("EDLength " + edKeys.length);
  //   for(i=0;i<edKeys.length;i++){
  //     if(dtaRecs[edKeys[i]]){
  //       mc++;
  //     }else{
  //       console.log(edKeys[i]);
  //     }
  //     m1 ++;
  //   }
  //   console.log("Matched with ED " + mc);
  //   console.log("TOTAL ED " + m1);

    // countWithImages(recs);
    writeToDB2(Object.values(dtaRecs), "consolidated");
    // countWithImages(recs);
  }
)();




const mapBeerData = (recs, images, edDta) => {
  let reqs = {};

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
    let edRec = edDta[newRec["upc"]];
    if (img && edRec) {
      newRec["imageFile"] = img["file"];
      copyEDData(edRec,newRec);
      reqs[id]= newRec;
    }
  }
  return reqs;
}



const mapWineData = (recs, images,edDta) => {
  let reqs = {};

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
    let edRec = edDta[newRec["upc"]];
    if (img && edRec) {
      newRec["imageFile"] = img["file"];
      copyEDData(edRec,newRec);
      reqs[id] = newRec;
    }

  }
  return reqs;
}

const mapLiquorData = (recs, images, edDta) => {
  let reqs = {};

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
    let edRec = edDta[newRec["upc"]];
    if (img && edRec) {
      newRec["imageFile"] = img["file"];
      copyEDData(edRec,newRec);
      reqs[id] =newRec;
    }

  }
  return reqs;
}


const mapEdData = (recs, images) => {
  let reqs = {};

  for (let i = 0; i < recs.length; i++) {
    let rec = recs[i];
    let newRec = {};
    let id = "";

    // Get Id Field Based on UPC_A or UPC_E
    if (rec["UPC-A"]) {
      id = rec["UPC-A"];
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
    if(rec["Displayed Product Name"])  newRec["prodNameExtended"] = rec["Displayed Product Name"];
    if(rec["Vendor Marketing Bullet 1"])  newRec["prodVendorBullet1"] = rec["Vendor Marketing Bullet 1"];
    if(rec["Vendor Marketing Bullet 2"])  newRec["prodVendorBullet2"] = rec["Vendor Marketing Bullet 2"];
    if(rec["Vendor Marketing Bullet 3"])  newRec["prodVendorBullet3"] = rec["Vendor Marketing Bullet 3"];
    if(rec["Vendor Marketing Bullet 4"])  newRec["prodVendorBullet4"] = rec["Vendor Marketing Bullet 4"];
    if(rec["Vendor Marketing Bullet 5"])  newRec["prodVendorBullet5"] = rec["Vendor Marketing Bullet 5"];
    if(rec["Vendor Marketing Bullet 6"])  newRec["prodVendorBullet6"] = rec["Vendor Marketing Bullet 6"];
    if(rec["Vendor Marketing Bullet 7"])  newRec["prodVendorBullet7"] = rec["Vendor Marketing Bullet 7"];
    if(rec["Vendor Marketing Statement 1"])  newRec["prodVendorMarketing1"] = rec["Vendor Marketing Statement 1"];
    if(rec["Vendor Marketing Statement 2"])  newRec["prodVendorMarketing2"] = rec["Vendor Marketing Statement 2"];
    if(rec["Vendor Marketing Statement 3"])  newRec["prodVendorMarketing3"] = rec["Vendor Marketing Statement 3"];
    if(rec["Vendor Marketing Statement 4"])  newRec["prodVendorMarketing4"] = rec["Vendor Marketing Statement 4"];
    
   reqs[id]= newRec;
  }
  return reqs;
}

const copyEDData = (edRec, newRec)=> {
  let prodShortDesc = "";
  let prodLongDesc = "";
  if(edRec["prodNameExtended"])  { newRec["prodNameExtended"] = edRec["prodNameExtended"]; }
  if(edRec["prodVendorBullet1"])  { newRec["prodVendorBullet1"] = edRec["prodVendorBullet1"]; prodShortDesc = edRec["prodVendorBullet1"]; }
  if(edRec["prodVendorBullet2"])  { newRec["prodVendorBullet2"] = edRec["prodVendorBullet2"]; prodShortDesc = prodShortDesc+ "\n" + edRec["prodVendorBullet2"]; }
  if(edRec["prodVendorBullet3"])  { newRec["prodVendorBullet3"] = edRec["prodVendorBullet3"]; prodShortDesc = prodShortDesc+ "\n" + edRec["prodVendorBullet3"]; }
  if(edRec["prodVendorBullet4"])  { newRec["prodVendorBullet4"] = edRec["prodVendorBullet4"]; prodShortDesc = prodShortDesc+ "\n" + edRec["prodVendorBullet4"]; }
  if(edRec["prodVendorBullet5"])  { newRec["prodVendorBullet5"] = edRec["prodVendorBullet5"]; prodShortDesc = prodShortDesc+ "\n" + edRec["prodVendorBullet5"]; }
  if(edRec["prodVendorBullet6"])  { newRec["prodVendorBullet6"] = edRec["prodVendorBullet6"]; prodShortDesc = prodShortDesc+ "\n" + edRec["prodVendorBullet6"]; }
  if(edRec["prodVendorBullet7"])  { newRec["prodVendorBullet7"] = edRec["prodVendorBullet7"]; prodShortDesc = prodShortDesc+ "\n" + edRec["prodVendorBullet7"]; }
  if(edRec["prodVendorMarketing1"])  { newRec["prodVendorMarketing1"] = edRec["prodVendorMarketing1"]; prodLongDesc = edRec["prodVendorMarketing1"]; }
  if(edRec["prodVendorMarketing2"])  { newRec["prodVendorMarketing2"] = edRec["prodVendorMarketing2"]; prodLongDesc = prodLongDesc + "\n" | edRec["prodVendorMarketing2"]; }
  if(edRec["prodVendorMarketing3"])  { newRec["prodVendorMarketing3"] = edRec["prodVendorMarketing3"]; prodLongDesc = prodLongDesc + "\n" | edRec["prodVendorMarketing3"]; }
  if(edRec["prodVendorMarketing4"])  { newRec["prodVendorMarketing4"] = edRec["prodVendorMarketing4"]; prodLongDesc = prodLongDesc + "\n" | edRec["prodVendorMarketing4"]; }

  if(prodShortDesc != "")  newRec["prodShortDesc"] = prodShortDesc;
  if(prodLongDesc != "" ) newRec["prodLongDesc"] = prodLongDesc;
}
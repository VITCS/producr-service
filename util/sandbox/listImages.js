const fs = require('fs');
const parent = "D:/infville/data";
const folders = ["images-1", "images-2","images-core"];

const listAll = () => { 

    let list = [];
    folders.forEach(folder => {
    let fld = parent + "/" + folder ;
        fs.readdirSync(fld).forEach(file => {
            let fullPath = fld + "/" + file;
            let parts = file.split("_");
            list.push({"name":parts[0],"fullPath":fullPath, "folder": fld, "file": file});
        });
    });

    console.log(list.length);

    var writer = fs.createWriteStream('imageList.csv', {
    flags: 'w' // 'a' means appending (old data will be preserved)
    })
    list = list.sort((a, b) => {
        return a.name- b.name;
    });
    list.forEach(e => {
        writer.write(e['name'] + "," + e.file + "," +  e.fullPath+ "\n");
    });
};



const listWithoutDups = () => { 

    let list = {};
    folders.forEach(folder => {
    let fld = parent + "/" + folder ;
        fs.readdirSync(fld).forEach(file => {
            let fullPath = fld + "/" + file;
            let parts = file.split("_");
            list[+parts[0]] ={"name":parts[0],"fullPath":fullPath, "folder": fld, "file": file} ; 
        });
    });


    var writer = fs.createWriteStream('imageListUnique.csv', {
    flags: 'w' // 'a' means appending (old data will be preserved)
    })
    const l = Object.values(list);
    console.log(l.length);
    l.forEach(e => {
        writer.write(e['name'] + "," + e.file + "," +  e.fullPath+ "\n");
    });
};

const listWithoutDups2 = () => { 

    let list = {};
    folders.forEach(folder => {
    let fld = parent + "/" + folder ;
        fs.readdirSync(fld).forEach(file => {
            let fullPath = fld + "/" + file;
            let parts = file.split("_");
            list[parts[0]] ={"name":parts[0],"fullPath":fullPath, "folder": fld, "file": file} ; 
        });
    });


    var writer = fs.createWriteStream('imageListUnique2.csv', {
    flags: 'w' // 'a' means appending (old data will be preserved)
    })
    const l = Object.values(list);
    console.log(l.length);
    l.forEach(e => {
        writer.write(e['name'] + "," + e.file + "," +  e.fullPath+ "\n");
    });
};


listAll();
// listWithoutDups();
// listWithoutDups2();
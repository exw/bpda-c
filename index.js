// load the modules

// parsing modules
var request = require('request');
var progress = require('request-progress');
var cheerio = require('cheerio');
var sleep = require('system-sleep');

// wget download modules
var fs = require('fs');
var url = require('url');
var http = require('http');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;

// csv module
var json2csv = require('json2csv');
var newLine = "\r\n";

var pages = {};
pages["under-construction"] = "http://www.bostonplans.org/projects/development-projects?projectstatus=under+construction&sortby=name&sortdirection=ASC&type=dev&viewall=1";
pages["board-approved"] = "http://www.bostonplans.org/projects/development-projects?projectstatus=board+approved&sortby=name&sortdirection=ASC&type=dev&viewall=1"
pages["under-review"] = "http://www.bostonplans.org/projects/development-projects?projectstatus=under+review&sortby=name&sortdirection=ASC&type=dev&viewall=1"

var page = pages[process.argv[2]];
console.log("Setting start page at " + page);

// var page = "https://bostonplans.org/projects/development-projects";
// var page = "http://www.bostonplans.org/projects/development-projects?neighborhoodid=19&projectstatus=under+review&sortby=name&sortdirection=ASC&type=dev"

// Under Review
// var page = "http://www.bostonplans.org/projects/development-projects?projectstatus=under+review&sortby=name&sortdirection=ASC&type=dev&viewall=1"

// Board Approved
//var page = "http://www.bostonplans.org/projects/development-projects?projectstatus=board+approved&sortby=name&sortdirection=ASC&type=dev&viewall=1"

//Under Construction
//var page = "http://www.bostonplans.org/projects/development-projects?projectstatus=under+construction&sortby=name&sortdirection=ASC&type=dev&viewall=1"

request(page, gotPage);

function gotPage(err, res, html) {
  if (err) console.log(err);
  // console.log("List Page Status Code:", res.statusCode);
  listPage(html);
}

function listPage(html) {
  var $ = cheerio.load(html);
  var devprojectList = $(".devprojectTable a"); 

  var dataFields = ["Property Description", "Address(es)", "Company Name(s)", "Proponents Name(s)","Address","Phone","Notes","Uses","Neighborhood","Project URL","Status","Overview"];
  
  var i;
  /*** Create master CSV file for folder ***/
    //console.log('Creating ' + csvFileName);
    var writeHeader = "";
    var newFileContent = "";
    for (i=0;i<dataFields.length;i++){
      // console.log(i);
      writeHeader += dataFields[i] + ",";
      newFileContent = writeHeader.replace(/,\s*$/, "") + newLine;
      }
    fs.writeFile('./temp.csv', newFileContent, function (err, stat) {
      if (err) console.log(err);
      console.log('Writing ' + newFileContent);
    });

  for (i=0;i<devprojectList.length;i++) { 
    var projectPageURI = devprojectList[i].attribs.href; 
    var projectPageURL = "http://bostonplans.org" + projectPageURI;
    console.log(projectPageURL);

    sleep(1000);
    // console.log("Slept 1 sec " + projectPageURI);
    request(projectPageURL, projectPage);
  }
}

function projectPage(err, res, html) {
  if (err) console.log(err);
  console.log("Project Page Status Code:", res.statusCode);

  var $ = cheerio.load(html);
  var output = "";
  var i;
  
  // load csv information

  var dataObj = {};
  var dataFields = ["Property Description", "Address(es)", "Company Name(s)", "Proponents Name(s)","Address","Phone","Notes","Uses","Neighborhood","Project URL","Status","Overview"];
  // note dataFields duplicated in listPage function, ~line 51

  var dataList;
  var pageType;
  if ($(".projectInfo").length) {
    pageType = "old";
    console.log("Old page type");
    dataList = $(".projectInfo li");
  }
  else if ($(".projATimelineDetails")) {
    pageType = "new";
    console.log("New page type");
    dataList = $(".bpdaPrjHeader");
  }
  //console.log(dataList);
  //populate temporary object
  var csvObj = {};
  for (i=0;i<dataFields.length;i++){
    csvObj[dataFields[i]] = "";
  }
  // get data from scraped information
  if (pageType = "old"){
  for (i=0;i<dataList.length;i++){
    webFieldName = dataList[i].children[0].children[0].data;
    webFieldData = dataList[i].children[1].children[0].data;
    console.log("Entering " + webFieldName + " " + webFieldData);
    //dataObj[dataList[i].children[0].children[0].data] = dataList[i].children[1].children[0].data;
    dataObj[webFieldName] = webFieldData;
    /*if (dataFields.indexOf(dataList[i].children[0].children[0].data) < 0) {
      dataFields.push(dataList[i].children[0].children[0].data);
    }*/
  }}
  else if (pageType = "new"){
  for (i=0;i<dataList.length;i++){
    webFieldName = dataList[i].children[0].data;
    webFieldData = $(".bpdaPrjDetails")[i].children[0].data;
    console.log("Entering " + webFieldName + " " + webFieldData);
    dataObj[webFieldName] = webFieldData;

    
  }
    switch(webFieldName) {
      case "Address:":
        csvObj["Address(es)"] = "\"" + webFieldData + "\"";
        break;
      case "Building Size:":
      case "Building Size":
        csvObj["Property Description"] = "\"" + webFieldData + "\"";
        break;
      case "Residential Units:":
        csvObj["Property Description"] = csvObj["Property Description"].replace(/\"\s*$/, "") + " with " + webFieldData + " res units\"";
        break;
      case "Uses:":
        csvObj["Uses"] = webFieldData;
        break;
      case "Neighborhood:":
      case "Neighborhood":
        csvObj["Neighborhood"] = webFieldData;
      case "Project Manager":
        csvObj["Project Manager"] = webFieldData;
      default:
        break;
    }
      //console.log(res.request.uri.href);
  } 
  csvObj["Project URL"] = res.request.uri.href; 
  csvObj["Overview"] = "\"" + $(".columnOne p")[0].children[0].data.replace(/"/g, "'") + "\"";
  // console.log($(".columnOne p")[0].children[0].data);

  // console.log(dataObj);

  if (dataObj["Neighborhood:"] != undefined){
    var csvFileName = dataObj["Neighborhood:"].replace(/\s+/g, '-') + "-Projects.csv";
    //console.log(csvData);
    var csvContent = "";
    for (i=0;i<dataFields.length;i++){
      csvContent += csvObj[dataFields[i]] + ",";
    }
    csvContent = csvContent.replace(/,\s*$/, "") + newLine;


    var downloadFolder = "./" + dataObj["Neighborhood:"].replace(/\s+/g, '-');
  }

  /*** Declare CSV Name ***/
  //var csvFullPath = downloadFolder + "/" + csvFileName;
  //var csvFullPath = "./" + csvFileName;
  var csvFullPath = "./temp.csv"
  mkdirIfReq(downloadFolder);
  
  

  fs.stat(csvFullPath, function(err, stat) {
    if (err == null) {
      console.log('Appending ' + dataObj["Address:"] + " at " + res.request.uri.href);
      fs.appendFile(csvFullPath, csvContent, function (err) {
        if (err) console.log(err);
        // console.log('Successfully added ' + dataObj["Address:"]);
      });
    }
    /*** disabling to create master csv files only 
      else {
      //console.log('Creating ' + csvFileName);
      var writeHeader = "";
      var newFileContent = "";
      for (i=0;i<dataFields.length;i++){
        writeHeader += dataFields[i] + ",";
        newFileContent = writeHeader.replace(/,\s*$/, "") + newLine + csvContent;
        fs.writeFile(csvFullPath, newFileContent, function (err, stat) {
          if (err) console.log(err);
          // console.log('Created ' + csvFileName);
          // 
        });
      }
    } */
  });
  // get documents on this page, if none visit documentsPage link
  var linkList = $(".documentLink");
  for (i=0;i<linkList.length;i++) {
    // download pdf
    var downloadLinkText = linkList[i].children[0].data;
    var downloadLink,downloadFile;
    if (downloadLinkText.includes("PNF") || downloadLinkText.includes("SPR")){ 
      downloadLink = "http://bostonplans.org" + linkList[i].attribs.href;
      downloadFile = downloadLinkText //.replace(/\s+/g, '-');
      // console.log(downloadFolder);
      // download_file_wget(downloadLink,downloadFile,downloadFolder);
      // download_file_fs(downloadLink,downloadFile,downloadFolder);
      download_file_request(downloadLink,downloadFile,downloadFolder);
      output += "\""; 
      output += downloadLink.href; 
      output +="\","; 
      //console.log(output);
    } 
    else {
      var projectLinkURL = "http://bostonplans.org" + $(".projectLinks a")[0].attribs.href; 
      // console.log(projectLinkURL);
      request(projectLinkURL, documentsPage);
      // Checking multiple pages
      // 
    }
  }
}

function documentsPage(err, res, html){
  if (err) console.log(err);
  var i;
  // console.log("Documents Page Status Code:", res.statusCode);
  var $ = cheerio.load(html);
  var getProjectName = $(".documentTableWrapper table tbody tr td p span a");
  if (getProjectName[0] != undefined){
    var projectFileName = getProjectName[0].children[0].data //.replace(/\s+/g, '-').replace(/[^A-Za-z0-9_-]/g, "");
    var skip = false;
  }
  else {
    var projectFileName = "";
    var skip = true;
  }
  var getNeighborhood = $(".linksWrapper span a");
  if (getNeighborhood[0] != undefined) {
    var downloadFolder = "./" + getNeighborhood[0].children[0].data.replace(/\s+/g, '-');
    var linkList = $(".downloadLink"); 
    // console.log(linkList);
    for (var i=0; i<linkList.length; i++){ 
      var linkURL = linkList[i].attribs.href;
      if (linkURL.includes("pnf") || linkURL.includes("spr")){ 
        if (!skip) {
          // download_file_wget(linkURL,projectFileName,downloadFolder);
          // download_file_fs(linkURL,projectFileName,downloadFolder);
          download_file_request(linkURL, projectFileName, downloadFolder);
        }
        /* var filename = linkList[i] + ".pdf"; 
        link.download = filename; 
        link.dispatchEvent(new MouseEvent('click')); 
        */
        // console.log(linkList[i].attribs.href);
      } 
    }
  }
}

function download_file_wget(file_url,raw_file_name,folder){
  mkdirIfReq(folder);
  var file_name = raw_file_name.replace(/\s+/g, '-').replace(/[^A-Za-z0-9_-]+/g, "").replace(/\r?\n|\r/g, "").replace(/\/\\/g, "") + ".pdf";
  var filePath = folder + "/" + file_name;
  fs.stat(filePath, function(err, stat) {
    if (err == null) {
      // console.log("Skipping " + file_name + " Download, File Exists");
    }
    else {
      // console.log ("Downloading " + file_name + " at " + file_url);
      var wget = 'wget -O ' + folder + "/" + file_name + ' ' + '"' + file_url + '"';
      var child = exec(wget, function(err, stdout, stderr) {
        if (err) console.log(err);
        // else  console.log(file_name + ' downloaded to ' + folder);
      });
    }
  });
}

function download_file_fs(uri, filename, folder){
  mkdirIfReq(folder);
  var filepath = folder + "/" + filename;
  var protocol = url.parse(uri).protocol.slice(0, -1);
  var deferred = Q.defer();
  var onError = function (e) {
    fs.unlink(filename);
    deferred.reject(e);
  }
  require(protocol).get(uri, function(response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      var fileStream = fs.createWriteStream(filepath);
        fileStream.on('error', onError);
        fileStream.on('close', deferred.resolve);
        response.pipe(fileStream);
    } else if (response.headers.location) {
        deferred.resolve(download(response.headers.location, filename));
    } else {
        deferred.reject(new Error(response.statusCode + ' ' + response.statusMessage));
    }
  }).on('error', onError);
  return deferred.promise;
};

function download_file_request(url, raw_file_name, folder){
  mkdirIfReq(folder);
  var file_name = raw_file_name.replace(/\s+/g, '-').replace(/[^A-Za-z0-9_-]+/g, "").replace(/\r?\n|\r/g, "").replace(/\/\\/g, "") + ".pdf";
  var file_path = folder + "/" + file_name;

  request.head(url, function(err, res, body){
    //console.log(file_name);
    if (res.headers['content-type'] === 'text/html'){
      console.log('failed, check ' + file_path);
      console.log('for url: ' + url);
      console.log('content-type:', res.headers['content-type']);
      //console.log('content-length:', res.headers['content-length']);
    }
    else{
      request(url).pipe(fs.createWriteStream(file_path));
    }
  });
}
 
function sleep(ms){
  return new Promise(resolve=>{
    setTimeout(resolve,ms)
  })
}

function mkdirIfReq(folder) {
  var mkdir = 'mkdir -p ' + folder;
  var child = exec(mkdir, function(err, stdout, stderr) {
    if (err) {
      console.log(err);
      return;
    }
    else return;
  }); 
}

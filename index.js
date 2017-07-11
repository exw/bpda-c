// load the modules

// parsing modules
var request = require('request');
var cheerio = require('cheerio');

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

// pages.push("https://bostonplans.org/projects/development-projects";)
pages["under-review"] = "http://www.bostonplans.org/projects/development-projects?neighborhoodid=19&projectstatus=under+review&sortby=name&sortdirection=ASC&type=dev&viewall=1"
// Under Review
pages["board-approved"] = "http://www.bostonplans.org/projects/development-projects?projectstatus=board+approved&sortby=name&sortdirection=ASC&type=dev&viewall=1"

//Under Construction

pages["under-construction"] = "http://www.bostonplans.org/projects/development-projects?projectstatus=under+construction&sortby=name&sortdirection=ASC&type=dev&viewall=1"

for(i=0;i<Object.getOwnPropertyNames(pages).length;i++){
  if(Object.getOwnPropertyNames(pages)[i] != undefined){
  mkdirIfReq(Object.getOwnPropertyNames(pages)[i]);
  var chDir = "cd " + Object.getOwnPropertyNames(pages)[i];
  console.log("Running " + chDir);
  exec(chDir, function(err, stdout, stderr) {
    runScript(pages[Object.getOwnPropertyNames(pages)[i]])
  }
  }
}

function runScript(page){
request(page, gotPage);

function gotPage(err, res, html) {
  if (err) console.log(err);
  // console.log("List Page Status Code:", res.statusCode);
  listPage(html);
}

function listPage(html) {
  var $ = cheerio.load(html);
  var devprojectList = $(".devprojectTable a"); 
  var dataArray = [];
  var i;
  for (i=0;i<devprojectList.length;i++) { 
    var projectPageURI = devprojectList[i].attribs.href; 
    var projectPageURL = "https://bostonplans.org" + projectPageURI;
//    console.log(projectPageURL);
    request(projectPageURL, projectPage);
  }
}

function projectPage(err, res, html) {
  if (err) console.log(err);
  // console.log("Project Page Status Code:", res.statusCode);

  var $ = cheerio.load(html);
  var output = "";
  var i;
  
  // load csv information
  var dataList = $(".projectInfo li");
  var dataObj = {};
  var dataFields = ["Property Description", "Address(es)", "Company Name(s)", "Proponents Name(s)","Address","Phone","Website Bio", "Notes", "Project URL"];
  
  //populate temporary object
  var csvObj;
  for (i=0;i<dataFields.length;i++){
    csvObj[dataFields[i]] = "";
  }
  var csvData = [];
  // populate objects, add to dataFields array if first time seen
  for (i=0;i<dataList.length;i++){
    var webFieldName = dataList[i].children[0].children[0].data];
    var webFieldData = dataList[i].children[1].children[0].data];
    //dataObj[dataList[i].children[0].children[0].data] = dataList[i].children[1].children[0].data;
    dataObj[webFieldName] = webFieldData;
    /*if (dataFields.indexOf(dataList[i].children[0].children[0].data) < 0) {
      dataFields.push(dataList[i].children[0].children[0].data);
    }*/
    var csvObj = {};
    switch(webFieldName) {
      case "Address:":
        csvObj["Address(es)"] = webFieldData;
        break;
      case "Land Sq. Feet:":
        csvObj["Property Description"] = webFieldData;
        break;
      case "Residential Units:":
        csvObj["Property Description"] += "," + webFieldData;
        break;
    }
      console.log(res.request.uri.href;
      csvObj["URL:"] = res.request.uri.href; 
      csvData.push(csvObj);
  } 
  

  // console.log(dataObj);

  var csvFileName = dataObj["Neighborhood:"].replace(/\s+/g, '-') + "-Projects.csv";
  var csvContent = json2csv({data: csvData, fields: dataFields}) + newLine;
  var downloadFolder = "./" + dataObj["Neighborhood:"].replace(/\s+/g, '-');
  mkdirIfReq(downloadFolder);
  var csvFullPath = downloadFolder + "/" + csvFileName;

  fs.stat(csvFullPath, function(err, stat) {
    if (err == null) {
      console.log('Appending ' + dataObj["Address:"]);
      fs.appendFile(csvFullPath, csvContent, function (err) {
        if (err) console.log(err);
        console.log('Successfully added ' + dataObj["Address:"]);
      });
    }
    else {
      console.log('Creating ' + csvFileName);
      writeFields = (dataFields + newLine);
      newFileContent = writeFields + csvContent;
      fs.writeFile(csvFullPath, newFileContent, function (err, stat) {
        if (err) console.log(err);
        console.log('Created ' + csvFileName);
      });
    }
  }); 
  // get documents on this page, if none visit documentsPage link
  var linkList = $(".documentLink");
  for (i=0;i<linkList.length;i++) {
    // console.log(linkList[i]);

    // download pdf
    var downloadLinkText = linkList[i].children[0].data;
    var downloadLink,downloadFile,downloadFolder;
    if (downloadLinkText.includes("PNF") || downloadLinkText.includes("SPR")){ 
      downloadLink = "https://bostonplans.org" + linkList[i].attribs.href;
      downloadFile = downloadLinkText.replace(/\s+/g, '-') + ".pdf";
      // console.log(downloadFolder);
      // download_file_wget(downloadLink,downloadFile,downloadFolder);
      output += "\""; 
      output += downloadLink.href; 
      output +="\","; 
      //console.log(output);
    } 
    else {
      var projectLinkURL = "https://bostonplans.org" + $(".projectLinks a")[0].attribs.href; 
      // console.log(projectLinkURL);
      request(projectLinkURL, documentsPage);
      // Checking multiple pages
      // 
      var pageLimit = 3;
      for (i=2;i<=pageLimit;i++){
        request(projectLinkURL + "&page=" + i, documentsPage);
      }
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
    var projectFileName = getProjectName[0].children[0].data.replace(/\s+/g, '-') + ".pdf";
  }
  else {
    var projectFileName = "";
  }
  var getNeighborhood = $(".linksWrapper span a");
  var downloadFolder = "./" + getNeighborhood[0].children[0].data.replace(/\s+/g, '-');
  var linkList = $(".downloadLink"); 
  // console.log(linkList);
  for (var i=0; i<linkList.length; i++){ 
    var linkURL = linkList[i].attribs.href;
    if (linkURL.includes("pnf") || linkURL.includes("spr")){ 
      download_file_wget(linkURL,projectFileName,downloadFolder);
      /* var filename = linkList[i] + ".pdf"; 
      link.download = filename; 
      link.dispatchEvent(new MouseEvent('click')); 
      */
      // console.log(linkList[i].attribs.href);
    } 
  }
}

function download_file_wget(file_url,file_name,folder){
  // mkdirIfReq(folder);
  var filePath = folder + "/" + file_name;
  fs.stat(filePath, function(err, stat) {
    if (err == null) {
      console.log("Skipping " + file_name + "Download, File Exists");
    }
    else {
      console.log ("Download command issued for " + file_name + " at " + file_url);
      var wget = 'wget -O ' + folder + "/" + file_name + ' ' + file_url;
      var child = exec(wget, function(err, stdout, stderr) {
        if (err) console.log(err);
        else console.log(file_name + ' downloaded to ' + folder);
      });
    }
  }
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
}

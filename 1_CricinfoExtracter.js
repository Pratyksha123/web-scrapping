//save to excel using excel4node
//create folders and save pdf using pdf-lib

//npm init -y
//npm install minimist
//npm install axios
//npm install jsdom
//npm install excel4node
//npm install pdf-lib

// node 1_CricinfoExtracter.js --excel=Worldcup.csv --dataDir=worldcup --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results


let minimist = require("minimist");
let axios =    require("axios");
let jsdom =    require("jsdom");
let excel4node = require("excel4node");
let pdf = require("pdf-lib");
let fs = require("fs");
let path = require("path");

//download html using axios
//extract information usingjsdom
//convert matches teams
//save teams to excel using excel4node
//create folders and save pdf using pdf-lib

let args = minimist(process.argv);

//browsee => url to html (but in actual it is -->  url se http request then server se html aayega in http response )

let responseKaPromise = axios.get(args.source);
responseKaPromise.then(function(response){
    let html = response.data;

    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;
    //console.log(document.title);

    let matchScoreDivs = document.querySelectorAll("div.match-score-block"); //we are going to get a array here.
    console.log(matchScoreDivs.length);
    let matches = [];
    for(let i =0; i<matchScoreDivs.length; i++){

        let match = {  //ham har div ke corresponding ek object bana rahe hai aur use ek array mein fill ker rahe hai
            t1 : "",
            t2 : "",
            t1s : "",
            t2s : "",
            result : ""
        };

        let teamParas = matchScoreDivs[i].querySelectorAll("div.name-detail > p.name");
        match.t1 = teamParas[0].textContent;
        match.t2 = teamParas[1].textContent;

        let scoreSpans = matchScoreDivs[i].querySelectorAll("div.score-detail > span.score");
        if(scoreSpans.length == 2){
            match.t1s = scoreSpans[0].textContent;
            match.t2s = scoreSpans[1].textContent;
        } else if(scoreSpans.length == 1){
            match.t1s = scoreSpans[0].textContent;
            //match.t2s = 
        }else{
            match.t1s = ""
            match.t2s = ""
        }

        let resultSpan = matchScoreDivs[i].querySelector("div.status-text>span")
        match.result = resultSpan.textContent;
        matches.push(match);

    }
    //console.log(matches);
    let matchesKaJSON = JSON.stringify(matches);
    fs.writeFileSync("matches.json",matchesKaJSON,"utf-8");

    let teams  = [];
    //put team in teams array if not already there

    for(let i= 0; i<matches.length; i++){
        addTeamToTeamsArrayIfNotAlreadyThere(teams, matches[i].t1);
        addTeamToTeamsArrayIfNotAlreadyThere(teams, matches[i].t2);
    }
    
    for(let i=0; i<matches.length; i++){
        addMatchToSpecificTeam(teams, matches[i].t1, matches[i].t2, matches[i].t1s, matches[i].t2s,matches[i].result)
        addMatchToSpecificTeam(teams, matches[i].t2, matches[i].t1, matches[i].t1s, matches[i].t2s,matches[i].result)
    }



    //push match at appropriate place
    let teamsKaJSON = JSON.stringify(teams);
    fs.writeFileSync("teams.json", teamsKaJSON,"utf-8");

    prepareExcel(teams, args.excel);
    prepareFoldersAndPdfs(teams, args.dataDir);

    
    

})

function prepareFoldersAndPdfs(teams, dataDir){
    fs.mkdirSync(dataDir);
    if(fs.existsSync(dataDir) == false){
        fs.mkdirSync(dataDir);
    }

    for(let i=0; i<teams.length; i++){
        let teamFolderName = path.join(dataDir, teams[i].name);
        if(fs.existsSync(teamFolderName) == false){
            fs.mkdirSync(teamFolderName);
        }

        for(let j=0; j<teams[i].matches.length; j++){
            let match = teams[i].matches[j];
            //console.log(match);
            createMatchScorecardPdf(teamFolderName,teams[i].name, match);
        }
    }

}

function createMatchScorecardPdf(teamFolderName,homeTeam, match){
    let matchFileName = path.join(teamFolderName, match.vs + ".pdf");
    let templateFileByte = fs.readFileSync("Template.pdf");
    let pdfDocKaPromise = pdf.PDFDocument.load(templateFileByte);
    //console.log(pdfDocKaPromise);
    pdfDocKaPromise.then(function(pdfdoc){
        let page = pdfdoc.getPage(0);
        //console.log(page);
        //page.drawText("HEllo World");
        
     page.drawText(homeTeam,{
            x: 320,
            y: 703,
            size: 8
        });
        page.drawText(match.vs,{
            x: 320,
            y: 688,
            size: 8
        });
        page.drawText(match.selfScore,{
            x: 320,
            y: 673,
            size: 8
        });
        page.drawText(match.oppScore,{
            x: 320,
            y: 658,
            size: 8
        });
        page.drawText(match.result,{
            x: 320,
            y: 646,
            size: 8
        }); 
        


        let changedBytesKaPromise = pdfdoc.save();
        changedBytesKaPromise.then(function(changedBytes){
            fs.writeFileSync(matchFileName, changedBytes);
        })
    }).catch(function(err){ 
        console.log(err);
    })
}

function prepareExcel(teams, excelFileName){
    let wb = new excel4node.Workbook();
    for(let i=0; i<teams.length; i++){

        let tsheet = wb.addWorksheet(teams[i].name);
        tsheet.cell(1,1).string("Vs");
        tsheet.cell(1,2).string("Self Score");
        tsheet.cell(1,3).string("Opp Score");
        tsheet.cell(1,4).string("Result");
        for(let j=0; j<teams[i].matches.length; j++){
            
            tsheet.cell(2 + j, 1).string(teams[i].matches[j].vs);
            
            tsheet.cell(2 + j, 2).string(teams[i].matches[j].selfScore);
            
            tsheet.cell(2 + j, 3).string(teams[i].matches[j].oppScore);
            
            tsheet.cell(2 + j, 4).string(teams[i].matches[j].result);
            
            
        }

    }
    wb.write(excelFileName);

}

function addTeamToTeamsArrayIfNotAlreadyThere(teams, teamName){
    let tidx = -1;
    for(let i = 0; i < teams.length; i++){
        if(teams[i].name == teamName){
            tidx = i;
            break;
        }
    }

    if(tidx == -1){    //agar hame ye nahi mila hai already then only we are gonna push it there. 
        teams.push({   //teams array mein hamne idhar ek object push kiya hai. jisme ki do objects hai. first teamName and second is details of it's matches
            name: teamName,
            matches: []
        })
    }   
 }

 function addMatchToSpecificTeam(teams, homeTeam, oppTeam, selfScore, oppScore, result){
     let tidx = -1;
     for(let i=0; i<teams.length; i++){
         if(teams[i].name == homeTeam){
             tidx = i;
             break;
         }
     }

     let team = teams[tidx];
     team.matches.push({
         vs: oppTeam,
         selfScore: selfScore,
         oppScore : oppScore,
         result : result
     })

 }
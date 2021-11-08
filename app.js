'use strict';

const express = require('express');
const fs = require('fs')
const cron = require('node-cron'); // Import node-cron (a task scheduler): https://www.npmjs.com/package/node-cron
const app = express();
const port = 8080;
const watchListLog = 'watchlist.log';
let watchList = [];

app.get('/addID/:videoId', (req, res) => {
  let videoId = req.params.videoId;
  let idx = watchList.indexOf(videoId);

  if (idx == -1) { // if videoID is not in watch list
    watchList.push(videoId);
    // Append new video ID to the end of log file
    fs.appendFile(watchListLog, `${videoId}\n`, err => {
      if (err) {
        console.error(err);
        return;
      }
    });
  }
  res.send(`Add videoID: ${videoId} to watch list. New watch list: ${watchList}`);
});


app.get('/removeID/:videoId', (req, res) => {  
  let videoId = req.params.videoId;
  let idx = watchList.indexOf(videoId);

  if (idx != -1) { //if videoID is in watch list
    watchList.splice(idx, 1);

    // Rewrite log file with update watch list
    fs.readFile(watchListLog, 'utf8', function (err,data) {
      if (err) {
        return console.log(err);
      }
      let oldList = data.split('\n');
      let newList = [];

      for (var i = 0; i < oldList.length; i++) {
        if (oldList[i] != videoId) {
          newList.push(oldList[i]);
        }
      }
    
      fs.writeFile(watchListLog, newList.join('\n'), 'utf8', function (err) {
         if (err) return console.log(err);
      });
    });
  }
  res.send(`Remove videoID: ${videoId} from watch list. New watch list: ${watchList}`);
});


app.get('/getRating/:videoId',(req, res) => {
  let videoId = req.params.videoId;
  let idx = watchList.indexOf(videoId);

  if (idx != -1) { //if videoID is in watch list
    // TODO: read rating history from database
    console.log(watchList);
  }
  res.send(`rating history of videoID: ${videoId}`);
});


function init() {
  console.log("load all video IDs from log file to memory...");
  
  fs.readFile(watchListLog, 'utf8' , (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    watchList = data.split('\n');
    console.log(`Initial watch list: ${watchList}`);
  })
};


app.listen(port, () => {
  console.log(`Server listening at port: ${port}`)
  init();
});


function getRatingFromYouTube() {
  // TODO: read from YouTube Data API the rating of every video ID in watch list and add data to database 
  console.log(`Checking ratings of video IDs: ${watchList}`);
}


// Cron job: run task: getRatingFromYouTube() periodically
cron.schedule('* * * * *', // Currently set to run every 1 minute
              getRatingFromYouTube, 
              {scheduled:true, timezone: "America/Chicago"});
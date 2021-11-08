'use strict';

const express = require('express');
const app = express();
const port = 8080;
let watchList = [];

function init() {
  console.log("load all video IDs from log file to memory...");
  // TODO: load all video IDs from log file to memory
  
};

app.get('/addID/:videoId', (req, res) => {
  let videoId = req.params.videoId;
  let idx = watchList.indexOf(videoId);

  if (idx == -1) { // if videoID is not in watch list
    watchList.push(videoId);
  }
  res.send(`Add videoID: ${videoId} to watch list. New watch list: ${watchList}`);
});

app.get('/removeID/:videoId', (req, res) => {  
  let videoId = req.params.videoId;
  let idx = watchList.indexOf(videoId);

  if (idx != -1) { //if videoID is in watch list
    watchList.splice(idx, 1);
  }
  res.send(`Remove videoID: ${videoId} from watch list. New watch list: ${watchList}`);
});

app.get('/getRating/:videoId',(req, res) => {
  let videoId = req.params.videoId;
  let idx = watchList.indexOf(videoId);

  if (idx != -1) { //if videoID is in watch list
    // TODO: read rating history from database
  }
  res.send(`rating history of videoID: ${videoId}`);
});

app.listen(port, () => {
  console.log(`Server listening at port: ${port}`)
  init();
});
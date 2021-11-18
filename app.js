'use strict';

const express = require('express');
const fs = require('fs')
const cron = require('node-cron'); // Import node-cron (a task scheduler): https://www.npmjs.com/package/node-cron
const mysql = require('mysql');
const {google} = require('googleapis');
const path = require('path');
const ejs = require('ejs');
const {authenticate} = require('@google-cloud/local-auth');

const app = express();
const port = 8080;
const watchListLog = 'watchlist.log';
const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'ratings'
});
const youtube = google.youtube({ // initialize the Youtube API library
  version: 'v3'
});

var auth;
var unauth = true;
let watchList = [];

// Connect to MySQL
connection.connect();

// Serving front end
app.use(express.static('public'));
app.use('/static', express.static(path.join(__dirname, 'public')));

app.engine('.html', require('ejs').__express);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

// Back end
app.get('/addID/:videoId', (req, res) => {
  let videoId = req.params.videoId;
  let idx = watchList.indexOf(videoId);

  if (idx == -1) { // if videoID is not in watch list
    let query = `CREATE TABLE \`${videoId}\`(time BIGINT NOT NULL, date VARCHAR(50) NOT NULL, viewCount INT NOT NULL, likeCount INT NOT NULL, dislikeCount INT NOT NULL, commentCount INT NOT NULL, PRIMARY KEY(date));`;
    connection.query(query, function(error, results, field) {
      if (error) throw error;
    });

    // Append new video ID to watch list and the end of log file
    watchList.push(videoId);
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
    
    let query = `DROP TABLE \`${videoId}\`;`;
    connection.query(query, function(error, results, field) {
      if (error) throw error;
    });
  }
  res.send(`Remove videoID: ${videoId} from watch list. New watch list: ${watchList}`);
});


app.get('/getRating/:videoId',(req, res) => {
  let videoId = req.params.videoId;
  let idx = watchList.indexOf(videoId);

  if (idx != -1) { //if videoID is in watch list
    let query = `SELECT * from \`${videoId}\`;`;
    connection.query(query, function(error, results, field) {
      if (error) throw error;
      res.send({'history': results});
    });
  }
  // res.send(`rating history of videoID.`);
});


app.get('/', (req, res) => {
  res.render('index');
})


async function getRatingFromYouTube() {
  if (watchList.length > 0) {
    let date = new Date();
    let time = date.getTime();
    let dateStr = date.toLocaleString('en-US', { timeZone: 'America/Chicago' });
    let video_ids = watchList.join(",");

    console.log(`current watchlist: ${video_ids}`);

    if (unauth) {
      console.log("Doing authorization...");
      auth = await authenticate({
        keyfilePath: path.join(__dirname, './client_secret.json'),
        scopes: ['https://www.googleapis.com/auth/youtube', 'https://www.googleapis.com/auth/youtubepartner', 'https://www.googleapis.com/auth/youtube.force-ssl'],
      });
      
      google.options({auth});
      unauth = false;
    }

    const res = await youtube.videos.list({
      part: 'statistics',
      id: `${video_ids}`
    });

    // Parse result and insert data into database
    const items = res.data.items;
    for (var i = 0; i < items.length; i++) {
      const id = items[i].id, viewCount = items[i].statistics.viewCount, likeCount = items[i].statistics.likeCount, dislikeCount = items[i].statistics.dislikeCount, commentCount = items[i].statistics.commentCount;
      const query = `INSERT INTO \`${id}\` VALUES(${time}, "${dateStr}", ${viewCount}, ${likeCount}, ${dislikeCount}, ${commentCount});`;
  
      connection.query(query, function(error, results, field) {
        if (error) {
          console.error(error);
        }
      })    
    }
  }
}


function init() {
  console.log("Load all video IDs from log file to memory...");

  fs.readFile(watchListLog, 'utf8' , (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    data = data.trim();
    watchList = data.length > 0 ? data.split('\n') : [];
    console.log(`Initial watch list: ${watchList}`);
  });

  cron.schedule('*/10 * * * * *', getRatingFromYouTube, {scheduled:true, timezone: "America/Chicago"});
};


app.listen(port, () => {
  console.log(`Server listening at port: ${port}`);
  init();
});
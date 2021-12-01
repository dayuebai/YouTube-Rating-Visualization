'use strict';

const express = require('express');
const fs = require('fs')
const cron = require('node-cron'); // Import node-cron (a task scheduler): https://www.npmjs.com/package/node-cron
const mysql = require('mysql');
const {google} = require('googleapis');
const path = require('path');
const ejs = require('ejs');

const app = express();
const port = 8080;
const watchListLog = 'watchlist.log';
const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'ratings'
});
const youtube = google.youtube({
  version: 'v3',
  auth: 'AIzaSyDy1das42uwCFvxh7rPIJ4iefrqH0PMxmM' // specify your API key here
});

let watchList = [];

// Connect to MySQL
connection.connect();

// Serving front end
app.use(express.static('public'));
// app.use('/static', express.static(path.join(__dirname, 'public')));

app.engine('.html', require('ejs').__express);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Back end
app.get('/addID/:videoId', (req, res) => {
  let videoId = req.params.videoId;
  let idx = watchList.indexOf(videoId);

  if (idx == -1) { // if videoID is not in watch list
    let query = `CREATE TABLE IF NOT EXISTS \`${videoId}\`(time BIGINT NOT NULL, date VARCHAR(50) NOT NULL, viewCount INT NOT NULL, likeCount INT NOT NULL, dislikeCount INT NOT NULL, commentCount INT NOT NULL, PRIMARY KEY(time));`;
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

    res.status(200).send(`Video ID: ${videoId} is added to watch list successfully.`)
  } else {
    res.status(201).send(`Video ID: ${videoId} already exists. Try searching it.`);
  }
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
    
    // let query = `DROP TABLE IF EXISTS \`${videoId}\`;`;
    // connection.query(query, function(error, results, field) {
    //   if (error) throw error;
    // });

    res.status(200).send(`Remove video ID: ${videoId} from watch list.`);
  } else {
    res.status(201).send(`Video ID: ${videoId} doesn't exist. Try adding it first.`);
  }
  
});


app.get('/getRating/:videoId',(req, res) => {
  let videoId = req.params.videoId;
  let idx = watchList.indexOf(videoId);

  if (idx != -1) { //if videoID is in watch list
    let query = `SELECT * from \`${videoId}\`;`;
    connection.query(query, function(error, results) {
      if (error) throw error;

      let fileContent = 'unix epoch,view count,like count,dislike count,comment count\n';
      for (let i = 0; i < results.length; i++) {
        let line = results[i];
        fileContent += `${line.time/1000},${line.viewCount},${line.likeCount},${line.dislikeCount},${line.commentCount}\n`;
      }

      fs.writeFile(`public/data/${videoId}.csv`, fileContent, err => {
        if (err) {
          console.error(err);
          return;
        }
      });

      res.render('rating', {'history': results, 'id': videoId});
    });
  } else {
    res.status(201).send(`Video ID: ${videoId} is not in watch list. Try adding it first.`);
  }
});


app.get('/', (req, res) => {
  res.render('index.html');
})


async function getRatingFromYouTube() {
  if (watchList.length > 0) {
    let date = new Date();
    let time = date.getTime();
    let dateStr = date.toLocaleString('en-US', { timeZone: 'America/Chicago' });
    let video_ids = watchList.join(",");

    console.log(`current watchlist: ${video_ids}`);

    const res = await youtube.videos.list({
      part: 'statistics',
      id: `${video_ids}`
    });

    // Parse result and insert data into database
    const items = res.data.items;
    for (var i = 0; i < items.length; i++) {
      const id = items[i].id, viewCount = items[i].statistics.viewCount, likeCount = items[i].statistics.likeCount, dislikeCount = items[i].statistics.dislikeCount, commentCount = items[i].statistics.commentCount;
      const query = `INSERT INTO \`${id}\` VALUES(${time}, "${dateStr}", ${viewCount}, ${likeCount}, ${dislikeCount}, ${commentCount});`;
      console.log(query);
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

  cron.schedule('* * * * *', getRatingFromYouTube, {scheduled:true, timezone: "America/Chicago"});
};


app.listen(port, () => {
  console.log(`Server listening at port: ${port}`);
  init();
});

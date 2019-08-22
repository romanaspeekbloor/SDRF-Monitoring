#!/usr/bin/env node
const bp = require('body-parser')
const mongoose = require('mongoose');
const WebSocket = require('ws');
const express = require('express');
const app = express();
const cors = require('cors');
const stdin = process.openStdin();

mongoose.connect('mongodb://127.0.0.1:27017/sdrf', { useNewUrlParser: true});

const ws = new WebSocket.Server({ port: 8080 }); 
let socket;

const freqSchema = new mongoose.Schema({ 
  date: String,
  time: String,
  hzLow: Number,
  hzHigh: Number,
  samples: Number,
  step: Number,
  freqs: [],
  createdAt: Number, 
});

const Freqs = mongoose.model('freqs', freqSchema);

// TODO better way of setting connecting and parsing as var
ws.on('connection', (s) => {
  socket = s; 
});

// websocket close
ws.on('close', () => {
  console.log('closing connection');
});

// std input
stdin.on('data', (raw) => {
  const data = raw.toString().split(',');
  const freqs = data.splice(6);
  const params = data.splice(0, 6);

  const sample = {
    date: params[0],
    time: params[1],
    hzLow: params[2],
    hzHigh: params[3],
    step: params[5],
    freqs,
    createdAt: new Date().getTime()
  };

  // Async/Await
  /*
  Freqs.create(sample, (err) => {
    if (err) return console.log(err);
    console.log('database updated...');
    const sampleBuffer = Buffer.from(JSON.stringify(sample));
    if (socket) socket.send(sampleBuffer);
  });
  */
});

// on pipe end: 
stdin.on('end', () => {
  console.log('pipe ended');
  // reader.readAsText();
});

// middleware
app.use(cors());
app.use(bp.urlencoded({ extended: false }))
app.use(bp.json());

// root get 
app.get('/', (req, res) => {
  Freqs.find({}).sort('-createdAt').limit(20).exec((err, data) => {
    if (err) return res.send(err);
    // TODO should pick up a range from database with the range properties
    // such as range, low hz, high hz for visualizing it
    res.send(data);
  });
});

// rtl post handler
// raspberry HTTP post request handler
// Responsible for receiving data from raspberry pie client
// ==========================================================
app.post('/rtldata', (req, res) => {
  console.log('receveData',req.body)

  // Response back to the client (raspberrry);
  res.send({
    instructions: {
      actions1: '1',  
      actions2: '2'  
    }
  })
})

// listen
app.listen(3010, () => {
  console.log('listening 3000');
});


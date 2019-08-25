#!/usr/bin/env node
// Imports/Dependencies
const stdin = process.openStdin();
const tsClient = require('timesync');
const axios = require('axios');
const exec = require('child_process').exec;

const rtlPowerCMD = 'rtl_power -f 153084000:153304000:0.8k -g 35 -1'; 

const ts = tsClient({
  interval: 10000,
  peers
});

let doSampling = true;

ts.on('sync', (state) => {
  console.log('state: ', state);
  exec(rtlPowerCMD, (err, stdout, stderr) => {
    if (err) console.log('ERROR: ', err);
    console.log('out: ', stdout);
  });
});


// Event handlers, executes function on 'data' event
/*
stdin.on('data', (raw) =>{
  console.log('data',raw.toString())
  const convertedData = raw.toString()
  // http headers
  const headers = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const data = {
    name: 'RX1_BLACK_PI',
    iq: convertedData
  };

  // post request using axios to the server
  if (doSampling) {
    doSampling = false;
    axios.post("http://192.168.10.242:3010/rtldata", data, headers)
    .then(function (response) {
      console.log('res: ', response.data);
      doSampling = true;
    })
    .catch(function (error) {
      console.log(error);
    });
  }
});
*/


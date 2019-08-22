#!/usr/bin/env node
// Imports/Dependencies
const stdin = process.openStdin();
const axios = require('axios');

let doSampling = true;

// Event handlers, executes function on 'data' event
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


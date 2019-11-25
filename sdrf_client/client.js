#!/usr/bin/env node
// Imports/Dependencies
const WebSocket = require('ws');
const exec = require('child_process').exec;

const ws = new WebSocket('ws://192.168.10.242:9000');

ws.on('open', () => {
  ws.send('RX3 connected');
});

const sample = (cmd) => new Promise(resolve => {
  exec(cmd, (err, stdout, stderr) => {
    console.log(err);
    console.log(stderr);
    console.log(stdout);
    resolve(stdout); 
  });
});

ws.on('message', (msg) => {
  const data = JSON.parse(msg);
  const now = new Date().getTime();
  const lag = now - data.timestamp;
  const delay = data.executionTime - lag;

  console.log('res: ', data, '\n lag: ', lag, '\n delay: ', delay);

  setTimeout(async () => {
    const beforeSampling = new Date().getTime();
    console.log('sampling time: ', beforeSampling)
    const cmd = 'rtl_power -f 153084000:153304000:0.8k -g 35 -i 0 -e -1 2>&1';
    const sdrData = await sample(cmd);
    const afterSampling = new Date().getTime();

    const response = {
      name: 'RX[3]',
      msg: 'Sampling done!',
      samplingTime: afterSampling - beforeSampling,
      timestamp: new Date().getTime()
    };

    console.log('sampling and messaging server...');
    ws.send(JSON.stringify(response));
  }, delay);
});


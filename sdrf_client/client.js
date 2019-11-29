#!/usr/bin/env node
// Imports/Dependencies
const WebSocket = require('ws');
const exec = require('child_process').exec;

const ws = new WebSocket('ws://192.168.10.242:9000');

ws.on('open', () => {
  ws.send('RX3 connected');
});

const sample = (cmd) => new Promise(r => {
  console.log('scanning...');
  exec(cmd, (err, out) => {
    if (err) return r({ err, out });
    r({ err, out }); 
  });
});

ws.on('message', async (msg) => {
  let t = new Date().getTime();
  const d = JSON.parse(msg);
  // const delay = await new Promise(r => setTimeout(r, d.execT - t));
  while (d.execT >= t) {
    t = new Date().getTime();
  }
  const cmd = 'rtl_power -f 153084000:153304000:0.8k -g 35 -i 2 -e -1 2>&1';
  const raw = await sample(cmd);
  const { err, out } = raw;
  const afterSampling = new Date().getTime();
  console.log(d.execT);

  const res = {
    name: 'RX 3',
    msg: 'Sampling done!',
    startTime: t,
    samplingTime: afterSampling - t, 
    data: err ? null : out,
    error: err ? 'error...' : null,
    timestamp: new Date().getTime()
  };


  console.log('complete!');
  ws.send(JSON.stringify(res));
});


#!/usr/bin/env node
// Imports/Dependencies
const WebSocket = require('ws');
const exec = require('child_process').exec;

const ws = new WebSocket('ws://192.168.10.242:9000');

ws.on('open', () => {
  ws.send('RX3 connected');
});

const now = (unit) => {
  const t = process.hrtime();
  units = {
    ms: t[0] * 1000 + t[1] / 1000000,
    micro: t[0] * 1000000 + t[1] / 1000, 
    ns: t[0] * 1000000000 + t[1],
  }

  if (units[unit]) return units[unit];
  return units.ms;
};

const takeSample = (cmd) => new Promise(resolve => {
  console.log('scanning...');
  exec(cmd, (err, stdout, stderr) => {
    if (err) return resolve(err);
    // TODO process stdout
    // build data object
    resolve(stdout); 
  });
});

ws.on('message', async (msg) => {
  const d = JSON.parse(msg);
  const start = now('ms'); 
  let t = new Date().getTime();
  
  console.log(start);
  console.log(new Date().getTime());

  const delay = await new Promise(r => setTimeout(r, d.runTime - t));
  const cmd = 'rtl_power -f 153084000:153304000:0.8k -g 35 -i 2 -e -1 2>&1';
  const sdrData = await takeSample(cmd);
  const afterSampling = new Date().getTime();

  const response = {
    name: 'RX[3]',
    msg: 'Sampling done!',
    startTime: t,
    samplingTime: afterSampling - t, 
    timestamp: new Date().getTime()
  };

  console.log('complete!');
  ws.send(`RX3 done at: ${t}\n${JSON.stringify(response)}`);
});


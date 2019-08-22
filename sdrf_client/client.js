// Imports/Dependencies

// axios - for making http request (post/get/etc)
const axios = require('axios')
// for receiving output data for example rtl_power ... | node server.js
const stdin = process.openStdin()

// Event handlers, executes function on 'data' event
stdin.on('data', (data) =>{
  console.log('data',data.toString())
  const convertedData = data.toString()
  // http headers
  const headers = {
    headers: {
      'Content-Type': 'application/json'
    }
  }

  // post request using axios to the server
  axios.post("http://192.168.10.242:3010/rtldata", { data: convertedData }, headers)
  .then(function (response) {
    console.log('res: ', response.data);
  })
  .catch(function (error) {
    console.log(error);
  });
});


import React, { Fragment, useEffect, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';

const url = 'http://localhost:3010';
const reader = new FileReader();
const wsClient = new WebSocket('ws://localhost:8080');
const onConnection = () => {
  console.log('websocket: connected');
};

wsClient.onopen = () => onConnection(); 
wsClient.onclose = (e) => console.log('closing ws connection... ', e);

let printN = 0;

// D3 stuff 
const margin = {top: 100, right: 50, bottom: 100, left: 50};
const width = 9450 - margin.left - margin.right;
const height = 2250 - margin.top - margin.bottom;

const colorScale = d3.scaleLinear()
  .range(['blue', 'yellow', 'red'])
  .domain([-127, 0, 127]);
let svg;

const Heatmap = () => {
  // TODO merge/review containers...
  const [samples, setSamples] = useState([]);
  const [d3data, setd3data] = useState([]);
  const [decoding, setDecoding] = useState(false);
  const [yDomain, setYDomain] = useState([]);

  const [D3Data, setD3Data] = useState({
    yDomain: [],
    samples: [],
    visData: []
  });

  // Testing
  const [xScale, setX] = useState(null);
  const [yScale, setY] = useState(null);

  const setupD3 = (id) => {
  };

  const freqsMapper = (data, hzLow, hzHigh, createdAt) => {
    const step = (hzHigh - hzLow) / data.freqs.length;
    let hz = parseInt(hzLow, 10);
    const tmpArray = [];

    const mappedData = data.freqs.map((db) => {
      const tmpObj = {};
      tmpObj.createdAt = createdAt;
      tmpObj.db = db;      
      tmpObj.hz = hz;
      hz = Math.round(hz + step);
      tmpArray.push(tmpObj);
      return tmpObj;
    });


    
    const dataObj = {
      samples: mappedData,
      d3data: tmpArray
    }

    return dataObj;
  };

  // FileReader 'onload' event
  reader.onload = ((s, d3, y) => {
    return (e) => {
      const data = JSON.parse(e.target.result);
    
      if (data) {
        const { hzLow, hzHigh, createdAt } = data
        const newLine = freqsMapper(data, hzLow, hzHigh, createdAt);
        let tmpArr = [...d3];
        tmpArr.splice(tmpArr.length - newLine.samples.length, tmpArr.length);
        tmpArr = [...newLine.d3data, ...tmpArr];

        let smp = [...D3Data.samples];
        smp.unshift(newLine.samples)
        smp.pop();

        const removed = y.splice(y.length - 1, y.length); 

        setD3Data({
          samples: smp,
          visData: tmpArr,
          yDomain: [newLine.d3data[0].createdAt, ...y]
        });

        console.log('complete')
      }
    }
  })(D3Data.samples, D3Data.visData, D3Data.yDomain);

  wsClient.onmessage = (msg) => handleMessage(msg);
  //Prepare d3
  const prepareD3 = (data, d3VisData) => {
    //d3.select('.chart').selectAll('svg').remove();
    svg = d3.select('.chart')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // X d3 scale
    const x = d3.scaleBand()
      .range([0, width])
      .domain(data[0].map(d => {
        return d.hz;
      }))
      .padding(0.01);

    // Y d3 scale
    const y = d3.scaleBand()
      .range([ height, 0 ])
      .domain(data.map((el) => el.map((item) => item.createdAt)
        .filter((v, i, a) => a.indexOf(v) === i)[0]))
      .padding(0.01);
    
    setD3Data({ 
      samples: data,
      visData: d3VisData,
      yDomain: data.map((el) => el.map((item) => item.createdAt).filter((v, i, a) => a.indexOf(v) === i)[0])
    });

    svg.append('g')
      .attr('transform', 'translate(0,' + height + ')')
      .call(d3.axisBottom(x))
      .attr('class','xAxis');

    svg.append("g")
        .call(d3.axisLeft(y))
        .attr('class','yAxis');

    setX(() => x);
    setY(() => y);
  };

  // Pull data from the server and store it in the state
  const getData = async () => {
    const res = await axios.get(url);
    const data = res.data;
    const baseHz = res.data[0].hzLow;
    const topHz = res.data[0].hzHigh;
    const step = (topHz - baseHz) / res.data[0].freqs.length;
    console.log('First Response: ', res);
    let hz = baseHz;
    // TODO investigate why?
    const dataVis = [];

    // TODO setSamples(map...)
    const mappedData = data.map((el, i) => {
      hz = baseHz;
      //return freqsMapper(el, baseHz, topHz, el.createdAt); 
      return el.freqs.map((db) => {
        const tmp = {};
        tmp.createdAt = el.createdAt;
        tmp.db = db;
        tmp.hz = hz;
        hz = Math.round(hz + step);
        dataVis.push(tmp);
        return tmp;
      });
    });

    console.log('vis data: ', dataVis);
    console.log('samples row: ', mappedData);

    // update state
    setD3Data({
      samples: mappedData,
      visData: dataVis
    });

    prepareD3(mappedData, dataVis);
  
    await new Promise((r) => setTimeout(r, 3000));

    // TODO remove when done testing...
    return new Promise((resolve) => {
      if (mappedData) return resolve(mappedData);
      resolve('mappedData -> undefined')
    });
  };

  useEffect(() => {
    console.log('onMount init();');
    wsClient.onmessage = (msg) => handleMessage(msg);

    if (samples.length < 1) getData();

    return () => {
      console.log('unmounting...');
    }
  }, ['decoding']);

  // websocket message handler
  const handleMessage = (msg) => {
    console.log('READER STATE: ', reader.readyState);
    if (reader.readyState !== 1) {
      console.log('decoding started')
      reader.readAsText(msg.data);
    } else if (reader.readyState === 2 || reader.readyState === 0) {
      setDecoding(false);
    }
  };

  if (D3Data.samples.length > 0 && !decoding && xScale && yScale && reader.readyState !== 1) {
    console.log(`rendering data = [${printN}]`);

    svg = d3.select('.chart');

    // Y d3 scale
    yScale.domain(D3Data.yDomain);

    let rects = svg.select('g').selectAll('rect')
      .remove()
      .exit()
      .data(D3Data.visData);

    rects.enter()
      .append('rect')
      .attr('x', (d) => {
        return xScale(d.hz);
      })
      .attr('y', (d) => {
        return yScale(d.createdAt);
      })
      .attr("width", xScale.bandwidth() )
      .attr("height", yScale.bandwidth() )
      .style("fill", function(d) { return colorScale(d.db)} )

    printN++;
  }
  
  const testButtonHandler = () => {
    console.log('re-render()')
  };

  // Testing... to remove
  const renderHeatmap = () => {
  };

  return (
    <Fragment>
      {renderHeatmap()}
      <button onClick={testButtonHandler}>test</button>
    </Fragment>
  );
};

const Main = () => {
  const [close, setClose] = useState(false);

  const handleClose = (e) => {
    setClose(close ? false : true);
    console.log('closing connection');
  };

  return (
    <Fragment>
      <button onClick={handleClose}>close</button>
      <svg className='chart'></svg>
      {close ? null : <Heatmap />} 
    </Fragment>
  );
}

const App = () => {
  return (
    <div style={{height: '100%'}} className="App">
      <Main />
    </div>
  );
};

export default App;

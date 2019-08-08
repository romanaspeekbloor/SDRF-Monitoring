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

// D3 stuff 
const margin = {top: 100, right: 50, bottom: 100, left: 50};
const width = 9450 - margin.left - margin.right;
const height = 1250 - margin.top - margin.bottom;

const colorScale = d3.scaleLinear()
  .range(['blue', 'yellow', 'red'])
  .domain([-127, 0, 127]);

const Heatmap = () => {
  // TODO merge/review containers...
  const [samples, setSamples] = useState([]);
  const [d3data, setD3Data] = useState([]);
  const [decoding, setDecoding] = useState(false);

  // Testing
  const [xScale, setX] = useState(null);
  const [yScale, setY] = useState(null);

  const svg = d3.select('.chart')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  const freqsMapper = (data, hzLow, hzHigh, createdAt) => {
    const step = (hzHigh - hzLow) / data.freqs.length;
    let hz = hzLow;
    const tmpArray = [];

    return data.freqs.map((db) => {
      const tmpObj = {};
      tmpObj.createdAt = createdAt;
      tmpObj.db = db;      
      tmpObj.hz = hz;
      hz = Math.round(hz + step);
      tmpArray.push(tmpObj);
      return tmpObj;
    });
  };

  wsClient.onmessage = (msg) => handleMessage(msg);

  // FileReader 'onload' event
  reader.onload = ((s) => {
    return (e) => {
      const data = JSON.parse(e.target.result);
    
      if (data) {
        const { hzLow, hzHigh, createdAt } = data
        const newLine = freqsMapper(data, hzLow, hzHigh, createdAt);
        let tmpArr = [...s];
        tmpArr.unshift(newLine);
        tmpArr.pop();
        setSamples(tmpArr);
        console.log('complete')
      }
    }
  })(samples)

  //Prepary d3
  const prepareD3 = (data) => {
    console.log('data: ', data)

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

    // update state
    setD3Data([...dataVis])
    setSamples([...mappedData]);
    prepareD3(mappedData);
  
    await new Promise((r) => setTimeout(r, 3000));

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
    console.log('handleMSG decoding -> ', decoding);
    console.log('reader state: ', reader.readyState)

    if (!decoding) {
      console.log('decoding started')
      reader.readAsText(msg.data);
    } else if (reader.readyState === 2) {
      setDecoding(false);
    }
  };

  console.log('re-rendering: ', samples.length)

  if (samples.length > 0 && xScale && yScale && !decoding) {
    console.log('should print THE map')
    console.log('xScale: ', xScale.bandwidth());
    console.log('svg: ', svg)
    
    svg.append('text')
      .attr('transform','translate(' + (width / 2) + ',' + (height + 40) + ')')
      .style('text-anchor','middle')
      .text('HZ');

    /*
    svg.selectAll('g.x text')
      .attr('transform', 'translate(-10,10) rotate(315)');
    */

//    svg.remove();

    svg.selectAll()
      .data(d3data)
      .enter()
      .append("rect")
      .attr("x", function(d) {
        return xScale(d.hz)
      })
      .attr("y", function(d) {
        return yScale(d.createdAt)
      })
      .attr("width", xScale.bandwidth() )
      .attr("height", yScale.bandwidth() )
      .style("fill", function(d) { return colorScale(d.db)} )
      .exit().remove();

    setDecoding(true);
  }
  
  const testButtonHandler = () => {
    console.log('re-render()')
    svg.selectAll()
      .data(samples.map(s => {
        s.hz += 10;
        s.db += 10;
        return s;
      }))
      .exit().remove()
      .enter().append('rect')
      .transition()
      .attr("x", function(d) {
        return xScale(d.hz / 2)
      })
      .attr("y", function(d) {
        return yScale(d.createdAt)
      })
      .attr("width", 20)
      .attr("height", 10)
      .style("fill", function(d) { return colorScale(d.db * 2)} )
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

let buffer = [];
const maxBufferLength = 1000; //? this might be mental
const epilepsyDeltaThershold = 36.75; //! prone to be changed
const kernelSize = 20; //? Like in the blur algorithms

let sendEnable = false;
let sendInterval = 750;
setInterval(() => {
  console.log('updating send enable');
  sendEnable = true;
}, sendInterval);

const epilepsyEstimate = () => {
  let epilepsyWarnings = 0;
  let bufferLen = buffer.length;

  if (bufferLen < 500) return false; // ignore it if the sample size is ignorable

  let sumForKernelSize = 0;

  for (let i=0; i<kernelSize-1; ++i) // init kernel sum calc
    sumForKernelSize += buffer[i]; // used to calculate average

  for (let i=kernelSize-1; i<bufferLen; ++i) {
    // check the current kernel average value
    sumForKernelSize += buffer[i]; // now we have a full kernel to calculate over
    let averageForKernelSize = sumForKernelSize / kernelSize; //* kernel avg result used for evaluation
    let aboveAverage = 0;
    let belowAverage = 0;

    let maxSample = 0, minSample = 10000; // we work with vector abs length, so only positive values are returned
    let aboveMedian = 0;
    let belowMedian = 0;

    for (let j=i-kernelSize; j<i; ++j) {
      maxSample = Math.max(maxSample, buffer[j]);
      minSample = Math.min(minSample, buffer[j]);

      if (buffer[j] >= averageForKernelSize)
        ++aboveAverage;
      else 
        ++belowAverage;
    }

    let averageMedian = (maxSample + minSample) / 2;
    for (let j=i-kernelSize; j<i; ++j)
      if (buffer[j] >= averageMedian)
        ++aboveMedian;
      else 
        ++belowMedian;

    let total = above + below; //* total number of points recorded over this kernelSize
    //? (this might be fixed, but it also might differ by +- 3 points for different kernels of the same buffer)

    //* We can consider the overall amplitude of this kernel to be a % of the maxSample based on a weight (the rate of points above the average aka a weird sort of fill factor)
    let amplitude = maxSample * (aboveAverage/total);

    if (amplitude < 10) //! this might trigger false negatives, gotta watch out for this when testing
      return false;
    
    let pointRateFillFactor = aboveMedian / total;
    //* if this is low, this means that most of the values are below the average recorded for this kernel
    //*   which means that the frequency at which the pet's body trumbles is low enough to consider it running. One peak (a leg impact) then nothing until the next kernel
    //* if this is high or around 0.5 then no clear conclusion can be drawn, it is either epilepsy or something triggered constant high intensity (which might not happen) or even nothing at all (for low delta values)

    if (pointRateFillFactor < 0.3)
      return false; //! this might trigger false negatives, gotto watch out for this when testing

    //* Now that we filtered the impossible epilepsy situations, we must get the overall delta jitter, and based on that we know if it is actually epilepsy
    let aboveSum = 0;
    let belowSum = 0;
    for (let j=i-kernelSize; j<i; ++j) {
      if (buffer[j] >= averageMedian)
        aboveSum += buffer[j];
      else 
        belowSum += buffer[j];
    }
    let aboveAvg = aboveSum / aboveMedian;
    let belowAvg = belowSum / belowMedian;
    if (aboveAvg - belowAvg > 4)
      ++epilepsyWarnings;

    sumForKernelSize -= buffer[i - kernelSize + 1];
  }

  if (epilepsyWarnings > (bufferLen / kernelSize) / 2) //! this might trigger false positives
    return true;

  return false;
}

let epilepsyEstimates = []
setInterval(() => {
  console.log('update epilepsy estimate');
  epilepsyEstimates.push(epilepsyEstimate());
});

var bodyParser = require("body-parser");
const express = require("express"); //express framework to have a higher level of methods
const app = express(); //assign app variable the express class/method
var http = require("http");
var path = require("path");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const server = http.createServer(app); //create a server

require("dns").lookup(require("os").hostname(), function (err, add, fam) {
  console.log("addr: " + add);
});

const WebSocket = require("ws");
const s = new WebSocket.Server({ server });

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname + "/index.html"));
});

s.on("connection", function (ws, req) {

  ws.on("message", function (message) {
    console.log("Received: " + message);
    if (message !== 'connection succeeded')
      s.clients.forEach(function (client) {
        //broadcast incoming message to all clients (s.clients)
        if (client != ws && client.readyState) {
          //except to the same client (ws) that sent this message
          let parsedMessage = JSON.parse(message);

          if (sendEnable) {
            console.log('Sending packet');
            sendEnable = false;
            client.send(JSON.stringify({
              intensity: parsedMessage[0].intensity,
              epilepsy: Boolean(epilepsyEstimates.reduce((accumulator, currentValue) => {
                  return currentValue ? accumulator + 1 : accumulator;
                }, 0) > (epilepsyEstimates.length / 2)),
            }));
            console.log('Epilepsy estimates', epilepsyEstimates);
            epilepsyEstimates = [];
          }

          buffer.push(parsedMessage);
          if (buffer.length > maxBufferLength)
            buffer.shift();
        }
      });
  });

  ws.on("close", function () {
    console.log("lost one client");
  });

  console.log("new client connected");
});

server.listen(3000);

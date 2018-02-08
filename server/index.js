const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const responseTime = require('response-time');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const minimalcss = require('minimalcss');
const puppeteer = require('puppeteer');
const now = require('performance-now');

const PORT = process.env.PORT || 5000;

// Multi-process to utilize all CPU cores.
if (cluster.isMaster) {
  console.error(`Node cluster master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.error(
      `Node cluster worker ${
        worker.process.pid
      } exited: code ${code}, signal ${signal}`
    );
  });
} else {
  const app = express();

  // This sets an 'X-Response-Time' header to every request.
  app.use(responseTime());

  // So we can parse JSON bodies
  app.use(bodyParser());

  // Priority serve any static files.
  app.use(express.static(path.resolve(__dirname, '../ui/build')));

  // Answer API requests.
  app.post('/api/minimize', async function(req, res) {
    const url = req.body.url;
    // XXX I don't know why you have to create a browser and
    // send it into minimalcss.minimize(). I tried passing
    // no browser but set
    // `puppeteerArgs: ['--no-sandbox', '--disable-setuid-sandbox']` and
    // that didn't work. Making an explicit puppeteer browser instance works.
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const t0 = now();
    await minimalcss
      .minimize({
        urls: [url],
        browser: browser
        // puppeteerArgs: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      .then(result => {
        browser.close();
        const t1 = now();
        res.set('Content-Type', 'application/json');
        // res.send('{"message":"Hello from the custom server!"}');
        result._took = t1 - t0;
        res.send(JSON.stringify({ result }));
        // console.log('OUTPUT', result.finalCss.length, result.finalCss);
      })
      .catch(error => {
        browser.close();
        res.set('Content-Type', 'application/json');
        // res.send('{"message":"Hello from the custom server!"}');
        console.error(`Failed the minimize CSS: ${error}`);
        res.send(
          JSON.stringify({
            error: error.toString()
          })
        );
      });
  });

  // All remaining requests return the React app, so it can handle routing.
  app.get('*', function(request, response) {
    response.sendFile(path.resolve(__dirname, '../ui/build', 'index.html'));
  });

  app.listen(PORT, function() {
    console.error(
      `Node cluster worker ${process.pid}: listening on port ${PORT}`
    );
  });
}

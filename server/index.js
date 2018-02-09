const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const responseTime = require('response-time');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const minimalcss = require('minimalcss');
const puppeteer = require('puppeteer');
const now = require('performance-now');
const prettier = require('prettier');
const LRU = require('lru-cache');

const PORT = process.env.PORT || 5000;

const LRUCache = LRU({
  max: 10,
  // length: function (n, key) { return n * 2 + key.length }
  // , dispose: function (key, n) { n.close() }
  maxAge: 1000 * 60 * 60
});

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
    res.set('Content-Type', 'application/json');

    const cached = LRUCache.get(url);
    if (cached) {
      res.send(cached);
      return;
    }
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
        result._took = t1 - t0;
        try {
          result._prettier = prettier.format(result.finalCss, {
            parser: 'css'
          });
        } catch (ex) {
          result._prettier_error = ex.toString();
        }
        LRUCache.set(url, JSON.stringify({ result }));
        result._cache_miss = true;
        res.send(JSON.stringify({ result }));
      })
      .catch(error => {
        browser.close();
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

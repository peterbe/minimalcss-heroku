const express = require('express');
const path = require('path');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const minimalcss = require('minimalcss');
const puppeteer = require('puppeteer');

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

  // Priority serve any static files.
  app.use(express.static(path.resolve(__dirname, '../ui/build')));

  // Answer API requests.
  app.get('/api', async function(req, res) {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    await minimalcss
      .minimize({
        urls: ['https://news.ycombinator.com'],
        browser: browser
        // puppeteerArgs: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      .then(result => {
        res.set('Content-Type', 'application/json');
        // res.send('{"message":"Hello from the custom server!"}');
        res.send(
          JSON.stringify({
            finalCss: result.finalCss
            // XXX include stats and verbose information
          })
        );
        console.log('OUTPUT', result.finalCss.length, result.finalCss);
      })
      .catch(error => {
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

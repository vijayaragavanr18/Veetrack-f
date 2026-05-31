/* eslint-disable @typescript-eslint/no-require-imports */
// Standalone Next.js server that survives process reaping
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev: true, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, () => {
    console.log(`> VeeTrack Frontend ready on http://localhost:${port}`);
  });
});

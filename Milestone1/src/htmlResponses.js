const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '..', 'client', 'client.html');
const docsPath = path.resolve(__dirname, '..', 'client', 'docs.html');
const cssPath = path.resolve(__dirname, '..', 'client', 'style.css');

let indexFile = '';
let docsFile = '';
let cssFile = '';

try {
  indexFile = fs.readFileSync(indexPath);
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('Error loading client.html', err);
  indexFile = Buffer.from('<h1>Client file not found</h1>', 'utf8');
}

try {
  docsFile = fs.readFileSync(docsPath);
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('Error loading docs.html', err);
  docsFile = Buffer.from('<h1>Docs file not found</h1>', 'utf8');
}

try {
  cssFile = fs.readFileSync(cssPath);
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('Error loading style.css', err);
  cssFile = Buffer.from('body { font-family: sans-serif; }', 'utf8');
}

const getIndex = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': Buffer.byteLength(indexFile) });
  response.write(indexFile);
  response.end();
};

const getCSS = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/css', 'Content-Length': Buffer.byteLength(cssFile) });
  response.write(cssFile);
  response.end();
};

const getDocs = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': Buffer.byteLength(docsFile) });
  response.write(docsFile);
  response.end();
};

module.exports = {
  getIndex,
  getCSS,
  getDocs,
};

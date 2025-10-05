const http = require('http');
const url = require('url');
const querystring = require('querystring');

const htmlHandler = require('./htmlResponses');
const pokedex = require('./pokedex');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

/**
 * Build a JSON response string and headers, then send or respond to HEAD.
 *
 * All responses include Content-Type and Content-Length headers.
 *
 * @param {Object} response - http.ServerResponse
 * @param {number} status - HTTP status code
 * @param {Object} bodyObj - JavaScript object to stringify as JSON
 * @param {boolean} isHead - if true, send headers only (no body)
 */
const sendJson = (response, status, bodyObj, isHead = false) => {
  const bodyString = JSON.stringify(bodyObj);
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(bodyString, 'utf8'),
  };

  response.writeHead(status, headers);

  if (isHead) {
    response.end();
    return;
  }

  response.write(bodyString);
  response.end();
};

/**
 * Helper to parse & validate common query params for /api/pokemon
 */
const parsePokemonQuery = (query) => {
  const parsed = {
    type: query.type || undefined,
    name: query.name || undefined,
    limit: query.limit ? Number(query.limit) : 50,
    offset: query.offset ? Number(query.offset) : 0,
  };

  // Validate numeric parameters
  if (Number.isNaN(parsed.limit) || parsed.limit < 0) {
    throw new Error('Invalid limit parameter');
  }

  if (Number.isNaN(parsed.offset) || parsed.offset < 0) {
    throw new Error('Invalid offset parameter');
  }

  return parsed;
};

/**
 * Router logic
 */
const onRequest = (request, response) => {
  const parsedUrl = url.parse(request.url);
  const pathname = parsedUrl.pathname;
  const method = request.method;

  // Route static files first
  if (pathname === '/') {
    htmlHandler.getIndex(request, response);
    return;
  }

  if (pathname === '/style.css') {
    htmlHandler.getCSS(request, response);
    return;
  }

  if (pathname === '/docs') {
    htmlHandler.getDocs(request, response);
    return;
  }

  // API endpoints under /api
  if (pathname.startsWith('/api')) {
    // Accept header: default to JSON
    const accept = (request.headers.accept || '').toLowerCase();
    const wantsJson = accept === '' || accept.includes('application/json');

    // If not JSON, we still default to JSON for this milestone.
    if (!wantsJson) {
      // We'll still produce JSON output but can add content-negotiation later
    }

    // GET /api/pokemon and HEAD
    if (pathname === '/api/pokemon') {
      if (method === 'HEAD') {
        // Validate params to compute Content-Length correctly
        try {
          const query = querystring.parse(parsedUrl.query);
          const opts = parsePokemonQuery(query);
          const results = pokedex.getAll(opts);
          const fakeBody = JSON.stringify(results);
          response.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(fakeBody, 'utf8'),
          });
          response.end();
        } catch (err) {
          const errBody = JSON.stringify({ message: err.message, id: 'badRequest' });
          response.writeHead(400, {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(errBody, 'utf8'),
          });
          response.end();
        }
        return;
      }

      if (method === 'GET') {
        try {
          const query = querystring.parse(parsedUrl.query);
          const opts = parsePokemonQuery(query);
          const results = pokedex.getAll(opts);
          sendJson(response, 200, results, false);
        } catch (err) {
          sendJson(response, 400, { message: err.message, id: 'badRequest' }, false);
        }
        return;
      }

      // Method not allowed
      sendJson(response, 405, { message: 'Method Not Allowed', id: 'methodNotAllowed' });
      return;
    }

    // GET /api/pokemon/id (query param id) - supports HEAD
    if (pathname === '/api/pokemon/id' || (pathname === '/api/pokemon' && parsedUrl.query && parsedUrl.query.includes('id='))) {
      // Support either /api/pokemon?id=NNN or /api/pokemon/id (prefer query)
      const query = querystring.parse(parsedUrl.query);
      const id = query.id;

      if (method === 'HEAD') {
        const found = pokedex.getById(id);
        if (!found) {
          const body = JSON.stringify({ message: 'Not found', id: 'notFound' });
          response.writeHead(404, {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body, 'utf8'),
          });
          response.end();
          return;
        }
        const body = JSON.stringify(found);
        response.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body, 'utf8'),
        });
        response.end();
        return;
      }

      if (method === 'GET') {
        const found = pokedex.getById(id);
        if (!found) {
          sendJson(response, 404, { message: 'Not found', id: 'notFound' });
          return;
        }
        sendJson(response, 200, found);
        return;
      }

      sendJson(response, 405, { message: 'Method Not Allowed', id: 'methodNotAllowed' });
      return;
    }

    // GET /api/types (list all types) - supports HEAD
    if (pathname === '/api/types') {
      if (method === 'HEAD') {
        const types = pokedex.getTypes();
        const fakeBody = JSON.stringify({ count: types.length, types });
        response.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(fakeBody, 'utf8'),
        });
        response.end();
        return;
      }

      if (method === 'GET') {
        const types = pokedex.getTypes();
        sendJson(response, 200, { count: types.length, types });
        return;
      }

      sendJson(response, 405, { message: 'Method Not Allowed', id: 'methodNotAllowed' });
      return;
    }

    // Unknown API endpoint -> 404 JSON
    sendJson(response, 404, { message: 'API endpoint not found', id: 'notFound' });
    return;
  }

  // Non-existent non-API route -> 404 (static)
  const body = JSON.stringify({ message: 'Resource not found', id: 'notFound' });
  response.writeHead(404, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body, 'utf8'),
  });
  response.write(body);
  response.end();
};

http.createServer(onRequest).listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on 127.0.0.1:${port}`);
});

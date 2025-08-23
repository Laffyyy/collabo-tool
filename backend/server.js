require('dotenv').config();
const http = require('http');
const app = require('./app');
const { env } = require('./config');

const port = Number(env.PORT || 5000);
app.set('port', port);

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`[backend] listening on http://localhost:${port}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[backend] Port ${port} is already in use.`);
  } else {
    console.error('[backend] Server error:', error);
  }
  process.exit(1);
});


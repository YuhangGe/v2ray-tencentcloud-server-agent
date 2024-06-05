import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import { monitor } from './tencent';
const TOKEN = process.env.TOKEN;

async function handle(req: IncomingMessage, res: ServerResponse) {
  if (!TOKEN) {
    console.error('missing token');
    req.destroy();
    return;
  }
  if (req.headers['x-token'] !== TOKEN) {
    req.destroy();
    return;
  }
  const url = req.url;
  if (url === '/ping') {
    monitor.ping();
    res.write('pong!');
    res.end();
  } else {
    res.writeHead(404);
    res.end();
  }
}
const server = createServer((req, res) => {
  try {
    handle(req, res).catch((ex) => {
      console.error(ex);
    });
  } catch (ex) {
    console.error(ex);
  }
});
server.listen(2081, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.info('V2Ray Server Agent Listening At 0.0.0.0:2081');
});

import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import { Monitor } from './tencent';
import { startV2Ray } from './v2ray';

const TOKEN = process.env.TOKEN;

function startMonitorServer() {
  const monitor = new Monitor();
  setInterval(
    () => {
      monitor.check().catch((ex) => {
        console.error(ex);
      });
    },
    4 * 60 * 1000,
  );

  async function handle(req: IncomingMessage, res: ServerResponse) {
    if (!TOKEN) {
      console.error('[agent] ==> missing token');
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

  return new Promise<void>((resolve) => {
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
      console.info('[agent] ==> Agent Listening At 0.0.0.0:2081');
      resolve();
    });
  });
}
async function bootstrap() {
  await startV2Ray();
  await startMonitorServer();
}

bootstrap().catch((ex) => {
  console.error(ex);
});

import 'dotenv/config';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import { Monitor } from './tencent';
import { prepareV2Ray, startV2Ray } from './v2ray';

const TOKEN = process.env.TOKEN;
const PING_URL = `/ping?token=${TOKEN}`;
const DELAY_URL = `/delay?token=${TOKEN}&minutes=`;
const SOCKS_URL = `/socks?token=${TOKEN}&enable=`;

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

  // 首次启动延迟30分钟。即初始启动时30分钟内都不关闭主机，30分钟后如果没有客户端的 ping 则关闭销毁。
  monitor.delay(30);

  async function handle(req: IncomingMessage, res: ServerResponse) {
    if (!TOKEN) {
      console.error('[agent] ==> missing token');
      req.destroy();
      return;
    }
    const url = req.url;
    if (!url) {
      res.end();
      return;
    }
    if (url === PING_URL) {
      monitor.ping();
      res.write('pong!');
      res.end();
    } else if (url.startsWith(SOCKS_URL)) {
      const enabled = url.slice(SOCKS_URL.length);
      void startV2Ray(enabled === 'true');
      res.write('ok!');
      res.end();
    } else if (url.startsWith(DELAY_URL)) {
      const m = url.slice(DELAY_URL.length);
      monitor.delay(parseInt(m));
      res.write('ok!');
      res.end();
    } else {
      req.destroy();
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
      console.info('[agent] ==> Agent Listening At 0.0.0.0:2081');
      resolve();
    });
  });
}
async function bootstrap() {
  await prepareV2Ray();
  await startV2Ray();
  await startMonitorServer();
}

bootstrap().catch((ex) => {
  console.error(ex);
});

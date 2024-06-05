// src/index.ts
import { createServer } from "node:http";

// src/tencent.ts
import { cvm } from "tencentcloud-sdk-nodejs";
var cvmClient = new cvm.v20170312.Client({
  credential: {
    secretId: process.env.SECRET_ID,
    secretKey: process.env.SECRET_KEY
  },
  region: process.env.REGION
});
var Monitor = class {
  #pingTime;
  constructor() {
    this.#pingTime = Date.now();
  }
  ping() {
    this.#pingTime = Date.now();
  }
  async _destroyInstance(id) {
    try {
      if (!id) {
        const res = await cvmClient.DescribeInstances({
          Filters: [
            {
              Name: "instance-name",
              Values: [process.env.RESOURCE_NAME]
            }
          ]
        });
        id = res.InstanceSet[0]?.InstanceId;
        if (!id) {
          console.error("Instance not found!");
          return;
        }
      }
      await cvmClient.TerminateInstances({
        InstanceIds: [id]
      });
    } catch (ex) {
      console.error(ex);
    }
  }
  async check() {
    const secs = Math.floor((Date.now() - this.#pingTime) / 1e3);
    if (secs > 10 * 60) {
      await this._destroyInstance();
    }
  }
};
var monitor = new Monitor();
setInterval(() => {
  monitor.check().catch((ex) => {
    console.error(ex);
  });
}, 60 * 1e3);

// src/index.ts
var TOKEN = process.env.TOKEN;
async function handle(req, res) {
  if (!TOKEN) {
    console.error("missing token");
    req.destroy();
    return;
  }
  if (req.headers["x-token"] !== TOKEN) {
    req.destroy();
    return;
  }
  const url = req.url;
  if (url === "/ping") {
    monitor.ping();
    res.write("pong!");
    res.end();
  } else {
    res.writeHead(404);
    res.end();
  }
}
var server = createServer((req, res) => {
  try {
    handle(req, res).catch((ex) => {
      console.error(ex);
    });
  } catch (ex) {
    console.error(ex);
  }
});
server.listen(2081, "0.0.0.0", () => {
  console.info("V2Ray Server Agent Listening At 0.0.0.0:2081");
});
//# sourceMappingURL=index.js.map

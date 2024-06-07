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
    console.log("[agent] ==> will destroy");
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
      console.log("[agent] ==> instance id is:", id);
      await cvmClient.TerminateInstances({
        InstanceIds: [id]
      });
    } catch (ex) {
      console.error(ex);
    }
  }
  async check() {
    const secs = Math.floor((Date.now() - this.#pingTime) / 1e3);
    console.log(`[agent] ==> check result: ${secs}/600`);
    if (secs > 10 * 60) {
      await this._destroyInstance();
    }
  }
};

// src/v2ray.ts
import { exec, spawn } from "child_process";
import path from "path";
import os from "os";
import { writeFile } from "fs/promises";
var HOME_DIR = os.homedir();
function execShell(cmd) {
  return new Promise((resolve, reject) => {
    exec(
      cmd,
      {
        cwd: HOME_DIR
      },
      (err, stdout, stderr) => {
        if (err) reject(err);
        else {
          stdout && console.log(stdout);
          stderr && console.error(stderr);
          resolve();
        }
      }
    );
  });
}
var Config = JSON.stringify({
  log: {
    access: {
      type: "None"
    },
    error: {
      type: "Console",
      level: "Error"
    }
  },
  inbounds: [
    {
      port: 2080,
      // 服务器监听端口
      protocol: "vmess",
      // 主传入协议
      settings: {
        users: [process.env.TOKEN]
      }
    }
  ],
  outbounds: [
    {
      protocol: "freedom",
      // 主传出协议
      settings: {}
    }
  ]
});
async function startV2Ray() {
  await execShell("rm -rf v2ray v2ray-linux-64.zip");
  await execShell("wget https://raw.githubusercontent.com/v2ray/dist/master/v2ray-linux-64.zip");
  await execShell("unzip -o v2ray-linux-64.zip -d v2ray");
  const v2rayDir = path.join(HOME_DIR, "v2ray");
  await writeFile(path.join(v2rayDir, "config.json"), Config);
  const process2 = spawn(
    path.join(v2rayDir, "v2ray"),
    ["run", "-c", path.join(v2rayDir, "config.json"), "-format", "jsonv5"],
    {
      cwd: v2rayDir
    }
  );
  process2.stdout.on("data", (msg) => {
    console.log("[v2ray] ==>", msg.toString());
  });
  process2.stderr.on("data", (msg) => {
    console.error("[v2ray] ==>", msg.toString());
  });
}

// src/index.ts
var TOKEN = process.env.TOKEN;
var PING_URL = `/ping?token=${TOKEN}`;
function startMonitorServer() {
  const monitor = new Monitor();
  setInterval(
    () => {
      monitor.check().catch((ex) => {
        console.error(ex);
      });
    },
    4 * 60 * 1e3
  );
  async function handle(req, res) {
    if (!TOKEN) {
      console.error("[agent] ==> missing token");
      req.destroy();
      return;
    }
    const url = req.url;
    if (url === PING_URL) {
      monitor.ping();
      res.write("pong!");
      res.end();
    } else {
      req.destroy();
    }
  }
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      try {
        handle(req, res).catch((ex) => {
          console.error(ex);
        });
      } catch (ex) {
        console.error(ex);
      }
    });
    server.listen(2081, "0.0.0.0", () => {
      console.info("[agent] ==> Agent Listening At 0.0.0.0:2081");
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
//# sourceMappingURL=index.js.map

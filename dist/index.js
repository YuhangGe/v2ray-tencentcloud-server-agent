// src/tencent.ts
import { cvm } from "tencentcloud-sdk-nodejs";
var cvmClient = new cvm.v20170312.Client({
  credential: {
    secretId: process.env.SECRET_ID,
    secretKey: process.env.SECRET_KEY
  },
  region: process.env.REGION
});

// src/v2ray.ts
import { exec } from "child_process";
import path from "path";
import os from "os";
import { writeFile } from "fs/promises";
import fs from "fs-extra";
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
  const v2rayDir = path.join(HOME_DIR, "v2ray");
  const v2rayZipFile = path.join(HOME_DIR, "v2ray-linux-64.zip");
  await fs.rm(v2rayDir, { recursive: true, force: true });
  await fs.rm(v2rayZipFile, { force: true });
  const res = await fetch("https://raw.githubusercontent.com/v2ray/dist/master/v2ray-linux-64.zip");
  const cnt = await res.arrayBuffer();
  await writeFile(v2rayZipFile, Buffer.from(cnt));
  await execShell("unzip -o v2ray-linux-64.zip -d v2ray");
  await writeFile(path.join(v2rayDir, "config.json"), Config);
}

// src/index.ts
var TOKEN = process.env.TOKEN;
async function bootstrap() {
  await startV2Ray();
}
bootstrap().catch((ex) => {
  console.error(ex);
});
//# sourceMappingURL=index.js.map

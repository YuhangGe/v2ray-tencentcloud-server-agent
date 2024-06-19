/* eslint-disable no-console */
import type { ChildProcessWithoutNullStreams } from 'child_process';
import { exec, spawn } from 'child_process';
import path from 'path';
import os from 'os';
import { writeFile } from 'fs/promises';
import fs from 'fs-extra';
const HOME_DIR = os.homedir();

function execShell(cmd: string) {
  return new Promise<void>((resolve, reject) => {
    exec(
      cmd,
      {
        cwd: HOME_DIR,
      },
      (err, stdout, stderr) => {
        if (err) reject(err);
        else {
          // eslint-disable-next-line no-console
          stdout && console.log(stdout);
          stderr && console.error(stderr);
          resolve();
        }
      },
    );
  });
}

const Config = {
  log: {
    access: {
      type: 'None',
    },
    error: {
      type: 'Console',
      level: 'Error',
    },
  },
  inbounds: [
    {
      port: 2080, // 服务器监听端口
      protocol: 'vmess', // 主传入协议
      settings: {
        users: [process.env.TOKEN],
      },
    },
  ],
  outbounds: [
    {
      protocol: 'freedom', // 主传出协议
      settings: {},
    },
  ],
};

async function downloadV2ray(v2rayZipFile: string) {
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(
        'https://raw.githubusercontent.com/v2ray/dist/master/v2ray-linux-64.zip',
      );
      const cnt = await res.arrayBuffer();
      await writeFile(v2rayZipFile, Buffer.from(cnt));
      return;
    } catch (ex) {
      console.error(ex);
    }
  }
  throw new Error('download v2ray failed');
}

let proc: ChildProcessWithoutNullStreams = null;
export async function prepareV2Ray() {
  console.log('Clear Old V2Ray...');
  const v2rayDir = path.join(HOME_DIR, 'v2ray');
  const v2rayZipFile = path.join(HOME_DIR, 'v2ray-linux-64.zip');
  await fs.rm(v2rayDir, { recursive: true, force: true });
  await fs.rm(v2rayZipFile, { force: true });
  console.log('Download V2Ray: v2ray-linux-64.zip...');
  await downloadV2ray(v2rayZipFile);
  await execShell('unzip -o v2ray-linux-64.zip -d v2ray');
}

export async function startV2Ray(enableSocks = false) {
  if (proc) {
    proc.kill();
  }
  if (enableSocks) {
    Config.inbounds.push({
      port: 2082,
      protocol: 'socks',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  } else {
    Config.inbounds.length = 1;
  }
  const v2rayDir = path.join(HOME_DIR, 'v2ray');
  await writeFile(path.join(v2rayDir, 'config.json'), JSON.stringify(Config));
  proc = spawn(
    path.join(v2rayDir, 'v2ray'),
    ['run', '-c', path.join(v2rayDir, 'config.json'), '-format', 'jsonv5'],
    {
      cwd: v2rayDir,
    },
  );
  proc.stdout.on('data', (msg) => {
    // eslint-disable-next-line no-console
    console.log('[v2ray] ==>', msg.toString());
  });
  proc.stderr.on('data', (msg) => {
    console.error('[v2ray] ==>', msg.toString());
  });
}

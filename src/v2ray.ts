import { exec, spawn } from 'child_process';
import path from 'path';
import os from 'os';
import { writeFile } from 'fs/promises';

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

const Config = JSON.stringify({
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
});

export async function startV2Ray() {
  await execShell('rm -rf v2ray v2ray-linux-64.zip');
  await execShell('wget https://raw.githubusercontent.com/v2ray/dist/master/v2ray-linux-64.zip');
  await execShell('unzip -o v2ray-linux-64.zip -d v2ray');

  const v2rayDir = path.join(HOME_DIR, 'v2ray');
  await writeFile(path.join(v2rayDir, 'config.json'), Config);
  const process = spawn(
    path.join(v2rayDir, 'v2ray'),
    ['run', '-c', path.join(v2rayDir, 'config.json'), '-format', 'jsonv5'],
    {
      cwd: v2rayDir,
    },
  );
  process.stdout.on('data', (msg) => {
    // eslint-disable-next-line no-console
    console.log('[v2ray] ==>', msg.toString());
  });
  process.stderr.on('data', (msg) => {
    console.error('[v2ray] ==>', msg.toString());
  });
}

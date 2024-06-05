import { cvm } from 'tencentcloud-sdk-nodejs';

const cvmClient = new cvm.v20170312.Client({
  credential: {
    secretId: process.env.SECRET_ID,
    secretKey: process.env.SECRET_KEY,
  },
  region: process.env.REGION,
});

export class Monitor {
  #pingTime: number;
  constructor() {
    this.#pingTime = Date.now();
  }
  ping() {
    this.#pingTime = Date.now();
  }
  async _destroyInstance(id?: string) {
    try {
      if (!id) {
        const res = await cvmClient.DescribeInstances({
          Filters: [
            {
              Name: 'instance-name',
              Values: [process.env.RESOURCE_NAME],
            },
          ],
        });
        id = res.InstanceSet[0]?.InstanceId;
        if (!id) {
          console.error('Instance not found!');
          return;
        }
      }
      await cvmClient.TerminateInstances({
        InstanceIds: [id],
      });
    } catch (ex) {
      console.error(ex);
    }
  }
  async check() {
    const secs = Math.floor((Date.now() - this.#pingTime) / 1000);
    if (secs > 10 * 60) {
      // 如果 10 分钟内都没有收到客户端的 ping 消息，销毁机器
      await this._destroyInstance();
    }
  }
}

export const monitor = new Monitor();
setInterval(() => {
  monitor.check().catch((ex) => {
    console.error(ex);
  });
}, 60 * 1000);

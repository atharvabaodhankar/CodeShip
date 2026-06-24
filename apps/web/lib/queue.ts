import { Queue } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const parseRedisUrl = (urlStr: string) => {
  try {
    const url = new URL(urlStr);
    return {
      host: url.hostname || 'localhost',
      port: url.port ? parseInt(url.port, 10) : 6379,
      username: url.username || undefined,
      password: url.password || undefined,
    };
  } catch (e) {
    return { host: 'localhost', port: 6379 };
  }
};

let queueInstance: Queue | undefined;

export function getDeploymentQueue(): Queue {
  if (!queueInstance) {
    console.log('[Queue] Lazily initializing BullMQ deployments queue...');
    queueInstance = new Queue('deployments', {
      connection: parseRedisUrl(REDIS_URL),
    });
  }
  return queueInstance;
}

export { Queue };

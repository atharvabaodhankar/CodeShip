import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { Worker, Job } from 'bullmq';
import { buildAndDeploy } from './builder.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const queueName = 'deployments';

console.log('----------------------------------------------------');
console.log('Rovel Deployment Worker Initializing...');
console.log(`Connecting to Redis at: ${REDIS_URL}`);
console.log(`Listening on Queue: '${queueName}'`);
console.log('----------------------------------------------------');

// Parse Redis URL for BullMQ connection options
const parseRedisUrl = (urlStr: string) => {
  try {
    const url = new URL(urlStr);
    return {
      host: url.hostname || 'localhost',
      port: url.port ? parseInt(url.port, 10) : 6379,
      username: url.username || undefined,
      password: url.password || undefined,
      maxRetriesPerRequest: null, // Required by BullMQ
    };
  } catch (e) {
    console.error('Failed to parse REDIS_URL, falling back to localhost options:', e);
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
};

const connectionOptions = parseRedisUrl(REDIS_URL);

// Define worker
const worker = new Worker(
  queueName,
  async (job: Job<{ deploymentId: string }>) => {
    const { deploymentId } = job.data;
    console.log(`[Job ${job.id}] Received deployment job for ID: ${deploymentId}`);
    
    try {
      await buildAndDeploy(deploymentId);
      console.log(`[Job ${job.id}] Finished build and deploy process.`);
    } catch (err: any) {
      console.error(`[Job ${job.id}] Build and deploy failed with error:`, err);
      throw err; // Fail the job in BullMQ
    }
  },
  {
    connection: connectionOptions,
    concurrency: 1, // Process 1 deployment at a time to avoid CPU overload
  }
);

worker.on('active', (job) => {
  console.log(`[Job ${job?.id}] Job is now active.`);
});

worker.on('completed', (job) => {
  console.log(`[Job ${job?.id}] Job completed successfully.`);
});

worker.on('failed', (job, err) => {
  console.error(`[Job ${job?.id}] Job failed:`, err);
});

console.log('Rovel background worker is running and waiting for jobs...');

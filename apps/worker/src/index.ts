import { loadConfig } from "@brm/config";
import type { Job } from "bullmq";
import { Queue, Worker } from "bullmq";

import {
  cleanupExpiredReviewCacheJobName,
  googleReviewSyncQueueName,
  maintenanceQueueName,
  metaWebhookQueueName,
  processMetaWebhookEventJobName,
  syncGoogleReviewsJobName
} from "./queue-names.js";
import { createBullMqConnection } from "./redis-connection.js";
import {
  createCleanupExpiredReviewCacheJob,
  createProcessMetaWebhookEventJob,
  createSyncGoogleReviewsJob
} from "./worker-composition.js";
import { logError, logInfo } from "./worker-logger.js";
import type { ProcessMetaWebhookEventJobData } from "./jobs/process-meta-webhook-event-job.js";

const workerAppName = "business-review-monitor-worker";
const config = loadConfig();
const syncGoogleReviewsJob = createSyncGoogleReviewsJob(config);
const cleanupExpiredReviewCacheJob = createCleanupExpiredReviewCacheJob();
const processMetaWebhookEventJob = createProcessMetaWebhookEventJob(config);

const connection = createBullMqConnection(config.REDIS_URL);
const googleReviewSyncQueue = new Queue(googleReviewSyncQueueName, {
  connection,
  prefix: config.BRM_QUEUE_PREFIX
});
const maintenanceQueue = new Queue(maintenanceQueueName, {
  connection,
  prefix: config.BRM_QUEUE_PREFIX
});
const metaWebhookQueue = new Queue(metaWebhookQueueName, {
  connection,
  prefix: config.BRM_QUEUE_PREFIX
});

await maintenanceQueue.add(
  cleanupExpiredReviewCacheJobName,
  {},
  {
    jobId: cleanupExpiredReviewCacheJobName
  }
);

const workers = [
  new Worker(googleReviewSyncQueueName, handleGoogleReviewSyncQueueJob, {
    connection,
    prefix: config.BRM_QUEUE_PREFIX
  }),
  new Worker(maintenanceQueueName, handleMaintenanceQueueJob, {
    connection,
    prefix: config.BRM_QUEUE_PREFIX
  }),
  new Worker(metaWebhookQueueName, handleMetaWebhookQueueJob, {
    connection,
    prefix: config.BRM_QUEUE_PREFIX
  })
];

for (const worker of workers) {
  worker.on("ready", () => {
    logInfo("worker_ready", {
      queueName: worker.name
    });
  });

  worker.on("failed", (job, error) => {
    logError("worker_job_failed", {
      errorMessage: error.message,
      jobId: job?.id ? String(job.id) : null,
      jobName: job?.name ?? null,
      queueName: worker.name
    });
  });
}

logInfo("worker_started", {
  appName: workerAppName,
  queuePrefix: config.BRM_QUEUE_PREFIX,
  queues: workers.map((worker) => worker.name).join(",")
});

async function handleGoogleReviewSyncQueueJob(job: Job<unknown>): Promise<void> {
  if (job.name !== syncGoogleReviewsJobName) {
    logInfo("worker_job_received", {
      jobId: String(job.id),
      jobName: job.name
    });
    return;
  }

  await syncGoogleReviewsJob.handle(job);
}

async function handleMaintenanceQueueJob(job: Job<unknown>): Promise<void> {
  if (job.name === cleanupExpiredReviewCacheJobName) {
    await cleanupExpiredReviewCacheJob.handle(job);
    return;
  }

  logInfo("worker_job_received", {
    jobId: String(job.id),
    jobName: job.name
  });
}

async function handleMetaWebhookQueueJob(job: Job<unknown>): Promise<void> {
  if (job.name !== processMetaWebhookEventJobName) {
    logInfo("worker_job_received", {
      jobId: String(job.id),
      jobName: job.name
    });
    return;
  }

  await processMetaWebhookEventJob.handle(job as Job<ProcessMetaWebhookEventJobData>);
}

async function shutdown(): Promise<void> {
  await Promise.all(workers.map((worker) => worker.close()));
  await Promise.all([googleReviewSyncQueue.close(), maintenanceQueue.close(), metaWebhookQueue.close()]);
}

process.on("SIGINT", () => {
  void shutdown().then(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void shutdown().then(() => process.exit(0));
});

import type { Job } from "bullmq";
import { z } from "zod";
import { logInfo } from "../worker-logger.js";

const processMetaWebhookEventJobDataSchema = z
  .object({
    payload: z.object({
      object: z.string(),
      entry: z.array(
        z.object({
          id: z.string(),
          time: z.number(),
          changes: z
            .array(
              z.object({
                field: z.string(),
                value: z.record(z.string(), z.unknown())
              })
            )
            .optional(),
          messaging: z
            .array(
              z.object({
                sender: z.object({
                  id: z.string(),
                  username: z.string().optional()
                }),
                recipient: z.object({
                  id: z.string(),
                  username: z.string().optional()
                }),
                timestamp: z.number(),
                message: z
                  .object({
                    id: z.string(),
                    text: z.string().optional(),
                    created_time: z.number().optional()
                  })
                  .optional(),
                postback: z
                  .object({
                    payload: z.string(),
                    title: z.string().optional()
                  })
                  .optional()
              })
            )
            .optional()
        })
      )
    }),
    receivedAt: z.string().datetime(),
    requestId: z.string().uuid()
  })
  .strict();

export type ProcessMetaWebhookEventJobData = z.infer<
  typeof processMetaWebhookEventJobDataSchema
>;

type JobEntry = ProcessMetaWebhookEventJobData["payload"]["entry"][0];
type JobMessage = NonNullable<JobEntry["messaging"]>[0];

export type ProcessMetaWebhookEventUseCase = {
  execute(input: ProcessMetaWebhookEventJobData): Promise<void>;
};

export class ProcessMetaWebhookEventJob {
  constructor(
    private readonly instagramConnectionRepository: {
      findByInstagramUserId: (instagramUserId: string) => Promise<{
        tenantId: string;
        instagramUserId: string;
      } | null>;
    }
  ) {}

  async handle(job: Job<ProcessMetaWebhookEventJobData>): Promise<void> {
    const parsedData = processMetaWebhookEventJobDataSchema.safeParse(job.data);

    if (!parsedData.success) {
      logInfo("process_meta_webhook_event_job_invalid_data", {
        jobId: job.id ? String(job.id) : "unknown",
        jobName: job.name,
        errors: JSON.stringify(parsedData.error.flatten().fieldErrors)
      });
      throw new Error("Invalid process-meta-webhook-event job data");
    }

    const data = parsedData.data;

    logInfo("process_meta_webhook_event_job_started", {
      jobId: job.id ? String(job.id) : "unknown",
      jobName: job.name,
      requestId: data.requestId,
      object: data.payload.object,
      entryCount: data.payload.entry.length
    });

    for (const entry of data.payload.entry) {
      await this.processEntry(entry, data.requestId);
    }

    logInfo("process_meta_webhook_event_job_completed", {
      jobId: job.id ? String(job.id) : "unknown",
      jobName: job.name,
      requestId: data.requestId,
      status: "completed"
    });
  }

  private async processEntry(entry: JobEntry, requestId: string): Promise<void> {
    if (entry.changes) {
      for (const change of entry.changes) {
        await this.processChange(change, entry.id, requestId);
      }
    }

    if (entry.messaging) {
      for (const message of entry.messaging) {
        await this.processMessage(message, requestId);
      }
    }
  }

  private async processChange(
    change: { field: string; value: Record<string, unknown> },
    entryId: string,
    requestId: string
  ): Promise<void> {
    logInfo("process_meta_webhook_event_change", {
      requestId,
      entryId,
      field: change.field,
      valueKeys: Object.keys(change.value).join(",")
    });

    if (change.field === "comments") {
      const value = change.value as Record<string, unknown>;
      const mediaId = value.media_id as string | undefined;
      const commentId = value.comment_id as string | undefined;
      const from = value.from as { id: string; username?: string } | undefined;

      logInfo("meta_webhook_comment_received", {
        requestId,
        entryId,
        mediaId: mediaId ?? "unknown",
        commentId: commentId ?? "unknown",
        fromUserId: from?.id ?? "unknown",
        fromUsername: from?.username ?? "unknown"
      });
    }

    if (change.field === "mentions") {
      logInfo("meta_webhook_mention_received", {
        requestId,
        entryId,
        valueKeys: Object.keys(change.value).join(",")
      });
    }
  }

  private async processMessage(
    message: JobMessage,
    requestId: string
  ): Promise<void> {
    const senderId = message.sender.id;

    const connection = await this.instagramConnectionRepository.findByInstagramUserId(senderId);

    if (!connection) {
      logInfo("meta_webhook_message_unknown_sender", {
        requestId,
        senderId,
        recipientId: message.recipient.id
      });
      return;
    }

    logInfo("meta_webhook_message_received", {
      requestId,
      tenantId: connection.tenantId,
      senderId,
      recipientId: message.recipient.id,
      hasMessage: message.message ? "true" : "false",
      hasPostback: message.postback ? "true" : "false"
    });
  }
}
import type { Job } from "bullmq";
import { z } from "zod";
import { logInfo } from "../worker-logger.js";
import type {
  MetaWebhookEntry,
  MetaWebhookChange,
  MetaWebhookMessaging
} from "@brm/review-monitoring";
import {
  DefaultInstagramCommentWebhookNormalizer,
  type InstagramCommentWebhookNormalizer
} from "@brm/review-monitoring";
import {
  DefaultInstagramMessageWebhookNormalizer,
  type InstagramMessageWebhookNormalizer
} from "@brm/review-monitoring";
import type {
  InstagramCommentRepository,
  UpsertInstagramCommentInput
} from "@brm/review-monitoring";
import type {
  InstagramConversationRepository,
  InstagramMessageRepository
} from "@brm/review-monitoring";
import type { StoredInstagramConnection } from "@brm/review-monitoring";
import {
  ProcessInstagramDirectMessage,
  type ProcessInstagramDirectMessageInput
} from "@brm/review-monitoring";

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
      findByInstagramUserId: (instagramUserId: string) => Promise<StoredInstagramConnection | null>;
      findByProfessionalAccountId: (professionalAccountId: string) => Promise<StoredInstagramConnection | null>;
    },
    private readonly instagramCommentRepository: InstagramCommentRepository,
    private readonly resolveInstagramWebhookIdentity: {
      execute: (input: { webhookAccountId: string }) => Promise<{
        connection: StoredInstagramConnection;
        resolvedInstagramUserId: string;
      } | null>;
    },
    private readonly instagramConversationRepository: InstagramConversationRepository,
    private readonly instagramMessageRepository: InstagramMessageRepository,
    private readonly processInstagramDirectMessage: ProcessInstagramDirectMessage,
    private readonly commentNormalizer: InstagramCommentWebhookNormalizer = new DefaultInstagramCommentWebhookNormalizer(),
    private readonly messageNormalizer: InstagramMessageWebhookNormalizer = new DefaultInstagramMessageWebhookNormalizer()
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
        await this.processChange(change as MetaWebhookChange, entry as MetaWebhookEntry, requestId);
      }
    }

    if (entry.messaging) {
      for (const message of entry.messaging) {
        await this.processMessage(message, requestId);
      }
    }
  }

  private async processChange(
    change: MetaWebhookChange,
    entry: MetaWebhookEntry,
    requestId: string
  ): Promise<void> {
    logInfo("process_meta_webhook_event_change", {
      requestId,
      entryId: entry.id,
      field: change.field,
      valueKeys: Object.keys(change.value).join(",")
    });

    // Diagnostic logging for webhook identity investigation
    logInfo("meta_webhook_identity_observed", {
      requestId,
      entryId: entry.id,
      field: change.field
    });

    if (change.field === "comments") {
      await this.processComment(change, entry, requestId);
    }

    if (change.field === "mentions") {
      logInfo("meta_webhook_mention_received", {
        requestId,
        entryId: entry.id,
        valueKeys: Object.keys(change.value).join(",")
      });
    }

    if (change.field !== "comments" && change.field !== "mentions") {
      logInfo("meta_webhook_unsupported_event", {
        requestId,
        entryId: entry.id,
        field: change.field,
        valueKeys: Object.keys(change.value).join(",")
      });
    }
  }

  private async processComment(
    change: MetaWebhookChange,
    entry: MetaWebhookEntry,
    requestId: string
  ): Promise<void> {
    const normalizedComment = this.commentNormalizer.normalize(entry, change);

    if (!normalizedComment) {
      logInfo("meta_webhook_comment_normalization_failed", {
        requestId,
        entryId: entry.id,
        field: change.field,
        valueKeys: Object.keys(change.value).join(",")
      });
      return;
    }

    logInfo("instagram_comment_normalized", {
      requestId,
      externalCommentId: normalizedComment.externalCommentId,
      externalMediaId: normalizedComment.externalMediaId ?? "unknown",
      instagramAccountId: normalizedComment.instagramAccountId,
      authorExternalId: normalizedComment.authorExternalId ?? "unknown",
      authorUsername: normalizedComment.authorUsername ?? "unknown",
      hasText: !!normalizedComment.text,
      textLength: normalizedComment.text?.length ?? 0
    });

    // Try to find connection by professional account ID first (webhook entry.id)
    let connection = await this.instagramConnectionRepository.findByProfessionalAccountId(
      normalizedComment.instagramAccountId
    );

    // If not found, run identity discovery against Meta API
    if (!connection) {
      logInfo("meta_webhook_comment_try_discovery", {
        requestId,
        entryId: entry.id,
        instagramAccountId: normalizedComment.instagramAccountId
      });

      const resolved =
        await this.resolveInstagramWebhookIdentity.execute({
          webhookAccountId: normalizedComment.instagramAccountId
        });

      if (resolved) {
        connection = resolved.connection;
      }
    }

    if (!connection) {
      logInfo("meta_webhook_comment_connection_not_found", {
        requestId,
        entryId: entry.id,
        instagramAccountId: normalizedComment.instagramAccountId,
        externalCommentId: normalizedComment.externalCommentId
      });
      return;
    }

    logInfo("instagram_connection_resolved", {
      requestId,
      tenantId: connection.tenantId,
      instagramConnectionId: connection.id,
      instagramUserId: connection.instagramUserId,
      instagramProfessionalAccountId: connection.instagramProfessionalAccountId ?? "unknown",
      username: connection.username ?? "unknown"
    });

    const upsertInput: UpsertInstagramCommentInput = {
      tenantId: connection.tenantId,
      instagramConnectionId: connection.id,
      externalCommentId: normalizedComment.externalCommentId,
      status: "NEW"
    };
    if (normalizedComment.externalMediaId !== undefined) upsertInput.externalMediaId = normalizedComment.externalMediaId;
    if (normalizedComment.authorExternalId !== undefined) upsertInput.authorExternalId = normalizedComment.authorExternalId;
    if (normalizedComment.authorUsername !== undefined) upsertInput.authorUsername = normalizedComment.authorUsername;
    if (normalizedComment.text !== undefined) upsertInput.text = normalizedComment.text;
    if (normalizedComment.createdAtExternal !== undefined) upsertInput.createdAtExternal = normalizedComment.createdAtExternal;

    const comment = await this.instagramCommentRepository.upsert(upsertInput);

    logInfo("instagram_comment_persisted", {
      requestId,
      commentId: comment.id,
      externalCommentId: comment.externalCommentId,
      tenantId: comment.tenantId,
      instagramConnectionId: comment.instagramConnectionId,
      status: comment.status
    });
  }

  private async processMessage(
    message: JobMessage,
    requestId: string
  ): Promise<void> {
    const senderId = message.sender.id;
    const recipientId = message.recipient.id;

    let connection = await this.instagramConnectionRepository.findByInstagramUserId(senderId);

    if (!connection) {
      connection = await this.instagramConnectionRepository.findByInstagramUserId(recipientId);
    }

    if (!connection) {
      logInfo("meta_webhook_message_unknown_sender", {
        requestId,
        senderId,
        recipientId
      });
      return;
    }

    logInfo("meta_instagram_messaging_event_observed", {
      requestId,
      entryId: message.sender.id,
      messagingCount: 1,
      messagingKeys: Object.keys(message).join(","),
      senderId: message.sender.id,
      recipientId: message.recipient.id,
      hasMessage: message.message ? "true" : "false",
      hasMid: message.message?.id ? "true" : "false",
      hasText: message.message?.text ? "true" : "false"
    });

    const normalizedMessage = this.messageNormalizer.normalize(
      { id: senderId, time: message.timestamp } as MetaWebhookEntry,
      message as MetaWebhookMessaging
    );

    if (!normalizedMessage) {
      logInfo("meta_webhook_message_normalization_failed", {
        requestId,
        senderId,
        recipientId
      });
      return;
    }

    logInfo("instagram_message_normalized", {
      requestId,
      externalMessageId: normalizedMessage.externalMessageId,
      instagramAccountId: normalizedMessage.instagramAccountId,
      senderExternalId: normalizedMessage.senderExternalId,
      recipientExternalId: normalizedMessage.recipientExternalId,
      direction: normalizedMessage.direction,
      hasText: !!normalizedMessage.text,
      textLength: normalizedMessage.text?.length ?? 0
    });

    const result = await this.processInstagramDirectMessage.execute({
      connection,
      normalizedMessage
    } as ProcessInstagramDirectMessageInput);

    logInfo("instagram_direct_message_processed", {
      requestId,
      tenantId: connection.tenantId,
      conversationId: result.conversationId,
      messageId: result.messageId,
      isNew: result.isNew
    });
  }
}
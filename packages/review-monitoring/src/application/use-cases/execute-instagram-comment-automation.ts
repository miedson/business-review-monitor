import {
  matchesInstagramComment,
  renderInstagramTemplate,
} from "../../domain/instagram-automation.js";
import type { InstagramReviewProvider } from "../ports/business-profile-review-provider.js";
import type {
  InstagramAutomationRepository,
  InstagramAutomationWithActions,
} from "../ports/instagram-automation-repository.js";
import type { InstagramConnectionRepository } from "../ports/instagram-connection-repository.js";
import type { TokenCipher } from "../ports/token-cipher.js";

export type InstagramCommentAutomationInput = {
  tenantId: string;
  instagramConnectionId: string;
  externalCommentId: string;
  commentId: string;
  mediaId: string | null;
  authorExternalId: string | null;
  username: string | null;
  text: string;
  postCaption?: string;
  postUrl?: string;
};

export class ExecuteInstagramCommentAutomation {
  constructor(
    private readonly dependencies: {
      repository: InstagramAutomationRepository;
      connectionRepository: InstagramConnectionRepository;
      provider: InstagramReviewProvider;
      tokenCipher: TokenCipher;
    },
  ) {}

  async execute(input: InstagramCommentAutomationInput): Promise<void> {
    const connection = await this.dependencies.connectionRepository.findByTenantId(input.tenantId);
    if (
      !connection ||
      connection.id !== input.instagramConnectionId ||
      connection.status !== "CONNECTED" ||
      !connection.encryptedAccessToken ||
      !connection.instagramProfessionalAccountId
    )
      return;
    if (
      input.authorExternalId &&
      input.authorExternalId === connection.instagramProfessionalAccountId
    )
      return;
    const candidates = await this.dependencies.repository.findActiveCandidates({
      tenantId: input.tenantId,
      instagramConnectionId: input.instagramConnectionId,
      mediaId: input.mediaId,
    });
    const matched = candidates
      .map((automation) => ({
        automation,
        result: matchesInstagramComment({
          text: input.text,
          matchType: automation.matchType,
          keywords: automation.keywords,
          excludedKeywords: automation.excludedKeywords,
        }),
      }))
      .filter((candidate) => candidate.result.matched);
    const selected =
      matched.find((candidate) => candidate.automation.scopeType === "SPECIFIC_MEDIA") ??
      matched[0];
    if (!selected) return;
    const execution = await this.dependencies.repository.createExecution({
      tenantId: input.tenantId,
      automationId: selected.automation.id,
      commentId: input.commentId,
      externalCommentId: input.externalCommentId,
      userId: input.authorExternalId,
      mediaId: input.mediaId,
      matchedKeyword: selected.result.keyword ?? null,
      metadata: { username: input.username },
    });
    if (!execution) return;
    await this.dependencies.repository.updateExecution({ id: execution.id, status: "PROCESSING" });
    const variables = {
      first_name: input.username?.split(/[._]/u)[0],
      username: input.username ?? undefined,
      comment_text: input.text,
      post_caption: input.postCaption,
      post_url: input.postUrl,
      link: selected.automation.dmLink ?? undefined,
    };
    const message = renderInstagramTemplate(selected.automation.dmMessage, variables).trim();
    const token = this.dependencies.tokenCipher.decrypt(connection.encryptedAccessToken);
    let succeeded = 0;
    let failed = 0;
    try {
      for (const action of selected.automation.actions.sort((a, b) => a.position - b.position)) {
        await this.dependencies.repository.createActionExecution({
          executionId: execution.id,
          actionId: action.id,
        });
        try {
          if (action.type === "PUBLIC_COMMENT_REPLY") {
            if (
              !selected.automation.publicReplyEnabled ||
              !this.dependencies.provider.replyToComment
            )
              continue;
            const replies = selected.automation.publicReplyMessages;
            const reply =
              replies[Math.floor(Math.random() * replies.length)] ?? "Te enviei no Direct!";
            const result = await this.dependencies.provider.replyToComment({
              accessToken: token,
              commentId: input.externalCommentId,
              message: renderInstagramTemplate(reply, variables),
            });
            await this.dependencies.repository.updateActionExecution({
              executionId: execution.id,
              actionId: action.id,
              status: "COMPLETED",
              externalId: result.id,
            });
          } else if (action.type === "SEND_INSTAGRAM_DM") {
            if (!this.dependencies.provider.sendPrivateReply)
              throw new Error("Instagram private replies are not supported by this provider");
            const result = await this.dependencies.provider.sendPrivateReply({
              accessToken: token,
              instagramAccountId: connection.instagramProfessionalAccountId,
              commentId: input.externalCommentId,
              message,
            });
            await this.dependencies.repository.updateActionExecution({
              executionId: execution.id,
              actionId: action.id,
              status: "COMPLETED",
              externalId: result.id,
            });
          }
          succeeded++;
        } catch (error) {
          await this.dependencies.repository.updateActionExecution({
            executionId: execution.id,
            actionId: action.id,
            status: "FAILED",
            errorMessage: error instanceof Error ? error.message : "Action failed",
          });
          failed++;
        }
      }
      await this.dependencies.repository.updateExecution({
        id: execution.id,
        status: failed === 0 ? "COMPLETED" : succeeded > 0 ? "PARTIAL" : "FAILED",
      });
    } catch (error) {
      await this.dependencies.repository.updateExecution({
        id: execution.id,
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Automation failed",
      });
    }
  }
}

export type { InstagramAutomationWithActions };

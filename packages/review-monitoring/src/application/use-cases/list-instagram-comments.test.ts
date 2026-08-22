import { beforeEach, describe, expect, it } from "vitest";

import { ListInstagramComments } from "@brm/review-monitoring";
import type {
  FindInstagramCommentsInput,
  InstagramComment,
  InstagramCommentRepository,
  InstagramCommentStatus,
} from "@brm/review-monitoring";

class FakeInstagramCommentRepository implements InstagramCommentRepository {
  private comments: InstagramComment[] = [];

  async upsert(
    input: Parameters<InstagramCommentRepository["upsert"]>[0],
  ): Promise<InstagramComment> {
    const existingIndex = this.comments.findIndex(
      (c) =>
        c.instagramConnectionId === input.instagramConnectionId &&
        c.externalCommentId === input.externalCommentId,
    );
    const existingComment = existingIndex >= 0 ? this.comments[existingIndex] : null;
    const comment: InstagramComment = {
      id: existingComment?.id ?? `comment_${this.comments.length + 1}`,
      tenantId: input.tenantId,
      instagramConnectionId: input.instagramConnectionId,
      externalCommentId: input.externalCommentId,
      externalMediaId: input.externalMediaId ?? null,
      authorExternalId: input.authorExternalId ?? null,
      authorUsername: input.authorUsername ?? null,
      text: input.text ?? null,
      createdAtExternal: input.createdAtExternal ?? null,
      status: (input.status ?? "NEW") as InstagramCommentStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (existingIndex >= 0) {
      this.comments[existingIndex] = comment;
    } else {
      this.comments.push(comment);
    }
    return comment;
  }

  async findByTenant(input: FindInstagramCommentsInput): Promise<InstagramComment[]> {
    let filtered = this.comments.filter((c) => c.tenantId === input.tenantId);
    if (input.instagramConnectionId) {
      filtered = filtered.filter((c) => c.instagramConnectionId === input.instagramConnectionId);
    }
    if (input.status) {
      filtered = filtered.filter((c) => c.status === input.status);
    }
    filtered.sort(
      (a, b) => (b.createdAtExternal?.getTime() ?? 0) - (a.createdAtExternal?.getTime() ?? 0),
    );
    return filtered.slice(0, input.limit ?? 50);
  }

  async findByIdForTenant(input: {
    id: string;
    tenantId: string;
  }): Promise<InstagramComment | null> {
    return this.comments.find((c) => c.id === input.id && c.tenantId === input.tenantId) ?? null;
  }

  async deleteByConnectionId(): Promise<void> {}

  seed(comments: InstagramComment[]): void {
    this.comments = comments;
  }
}

describe("ListInstagramComments", () => {
  let repository: FakeInstagramCommentRepository;
  let useCase: ListInstagramComments;

  beforeEach(() => {
    repository = new FakeInstagramCommentRepository();
    useCase = new ListInstagramComments({ instagramCommentRepository: repository });
  });

  it("returns comments for the tenant", async () => {
    const now = new Date();
    repository.seed([
      {
        id: "1",
        tenantId: "tenant_1",
        instagramConnectionId: "conn_1",
        externalCommentId: "ext_1",
        externalMediaId: "media_1",
        authorExternalId: "author_1",
        authorUsername: "user1",
        text: "Comment 1",
        createdAtExternal: new Date(now.getTime() - 1000),
        status: "NEW",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "2",
        tenantId: "tenant_1",
        instagramConnectionId: "conn_1",
        externalCommentId: "ext_2",
        externalMediaId: "media_2",
        authorExternalId: "author_2",
        authorUsername: "user2",
        text: "Comment 2",
        createdAtExternal: new Date(now.getTime() - 2000),
        status: "NEW",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await useCase.execute({ tenantId: "tenant_1" });

    expect(result.comments).toHaveLength(2);
    expect(result.comments[0]!.externalCommentId).toBe("ext_1");
    expect(result.comments[1]!.externalCommentId).toBe("ext_2");
  });

  it("filters by instagramConnectionId", async () => {
    const now = new Date();
    repository.seed([
      {
        id: "1",
        tenantId: "tenant_1",
        instagramConnectionId: "conn_1",
        externalCommentId: "ext_1",
        externalMediaId: null,
        authorExternalId: null,
        authorUsername: null,
        text: null,
        createdAtExternal: null,
        status: "NEW",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "2",
        tenantId: "tenant_1",
        instagramConnectionId: "conn_2",
        externalCommentId: "ext_2",
        externalMediaId: null,
        authorExternalId: null,
        authorUsername: null,
        text: null,
        createdAtExternal: null,
        status: "NEW",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await useCase.execute({ tenantId: "tenant_1", instagramConnectionId: "conn_1" });

    expect(result.comments).toHaveLength(1);
    expect(result.comments[0]!.instagramConnectionId).toBe("conn_1");
  });

  it("filters by status", async () => {
    const now = new Date();
    repository.seed([
      {
        id: "1",
        tenantId: "tenant_1",
        instagramConnectionId: "conn_1",
        externalCommentId: "ext_1",
        externalMediaId: null,
        authorExternalId: null,
        authorUsername: null,
        text: null,
        createdAtExternal: null,
        status: "NEW",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "2",
        tenantId: "tenant_1",
        instagramConnectionId: "conn_1",
        externalCommentId: "ext_2",
        externalMediaId: null,
        authorExternalId: null,
        authorUsername: null,
        text: null,
        createdAtExternal: null,
        status: "READ",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await useCase.execute({ tenantId: "tenant_1", status: "NEW" });

    expect(result.comments).toHaveLength(1);
    expect(result.comments[0]!.status).toBe("NEW");
  });

  it("returns empty array for different tenant", async () => {
    const now = new Date();
    repository.seed([
      {
        id: "1",
        tenantId: "tenant_1",
        instagramConnectionId: "conn_1",
        externalCommentId: "ext_1",
        externalMediaId: null,
        authorExternalId: null,
        authorUsername: null,
        text: null,
        createdAtExternal: null,
        status: "NEW",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await useCase.execute({ tenantId: "tenant_2" });

    expect(result.comments).toHaveLength(0);
  });

  it("respects limit and returns nextCursor", async () => {
    const now = new Date();
    const comments = Array.from({ length: 5 }, (_, i) => ({
      id: String(i + 1),
      tenantId: "tenant_1",
      instagramConnectionId: "conn_1",
      externalCommentId: `ext_${i + 1}`,
      externalMediaId: null,
      authorExternalId: null,
      authorUsername: null,
      text: null,
      createdAtExternal: null,
      status: "NEW" as const,
      createdAt: now,
      updatedAt: now,
    }));
    repository.seed(comments);

    const result = await useCase.execute({ tenantId: "tenant_1", limit: 3 });

    expect(result.comments).toHaveLength(3);
    expect(result.nextCursor).toBe("4");
  });
});

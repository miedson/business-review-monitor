import type { InstagramCommentRepository } from "@brm/review-monitoring";
import type { FindInstagramCommentsInput, InstagramComment } from "@brm/review-monitoring";

export type ListInstagramCommentsInput = FindInstagramCommentsInput;

export type ListInstagramCommentsResult = {
  comments: InstagramComment[];
  nextCursor: string | null;
};

export type ListInstagramCommentsDependencies = {
  instagramCommentRepository: InstagramCommentRepository;
};

export class ListInstagramComments {
  constructor(private readonly dependencies: ListInstagramCommentsDependencies) {}

  async execute(input: ListInstagramCommentsInput): Promise<ListInstagramCommentsResult> {
    const limit = input.limit ?? 50;
    const comments = await this.dependencies.instagramCommentRepository.findByTenant({
      ...input,
      limit: limit + 1
    });

    let nextCursor: string | null = null;
    if (comments.length > limit) {
      const nextComment = comments.pop()!;
      nextCursor = nextComment.id;
    }

    return {
      comments,
      nextCursor
    };
  }
}
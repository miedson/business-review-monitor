export type ReviewStarRating = "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";

export type BusinessReview = {
  id: string;
  reviewerName?: string;
  starRating: ReviewStarRating;
  comment?: string;
  reviewReply?: { comment: string; updatedAt?: Date };
  createdAt: Date;
  updatedAt: Date;
};

export type ReviewSummary = {
  averageRating?: number;
  totalReviewCount?: number;
};

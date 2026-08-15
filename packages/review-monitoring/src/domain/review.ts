export type ReviewStarRating = "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";

export type BusinessReview = {
  id: string;
  reviewerName?: string;
  starRating: ReviewStarRating;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ReviewSummary = {
  averageRating?: number;
  totalReviewCount?: number;
};

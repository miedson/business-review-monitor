export type MetaWebhookVerifyQuery = {
  "hub.mode": string;
  "hub.verify_token": string;
  "hub.challenge": string;
};

export type MetaWebhookEntry = {
  id: string;
  time: number;
  changes?: MetaWebhookChange[];
  messaging?: MetaWebhookMessaging[];
};

export type MetaWebhookChange = {
  field: string;
  value: MetaWebhookChangeValue;
};

export type MetaWebhookCommentValue = {
  media_id?: string;
  comment_id?: string;
  from?: MetaWebhookFrom;
  created_time?: number;
  text?: string;
  id?: string;
  media?: { id: string } | string;
};

export type MetaWebhookChangeValue = {
  media_id?: string;
  comment_id?: string;
  from?: MetaWebhookFrom;
  message?: MetaWebhookMessage;
  created_time?: number;
  item?: string;
  verb?: string;
  text?: string;
};

export type MetaWebhookFrom = {
  id: string;
  username?: string;
};

export type MetaWebhookMessage = {
  id?: string;
  mid?: string;
  text?: string;
  created_time?: number;
};

export type MetaWebhookMessaging = {
  sender: MetaWebhookFrom;
  recipient: MetaWebhookFrom;
  timestamp: number;
  message?: MetaWebhookMessage;
  postback?: MetaWebhookPostback;
};

export type MetaWebhookPostback = {
  payload?: string;
  title?: string;
};

export type MetaWebhookPayload = {
  object: string;
  entry: MetaWebhookEntry[];
};

export type MetaWebhookErrorCode =
  | "META_WEBHOOK_INVALID_VERIFY_TOKEN"
  | "META_WEBHOOK_INVALID_SIGNATURE"
  | "META_WEBHOOK_INVALID_PAYLOAD"
  | "META_WEBHOOK_UNSUPPORTED_EVENT";

export class MetaWebhookError extends Error {
  constructor(
    readonly code: MetaWebhookErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "MetaWebhookError";
  }
}

export type MetaWebhookVerifyResult =
  { success: true; challenge: string } | { success: false; error: MetaWebhookError };

export type MetaWebhookProcessResult =
  { success: true; eventId: string } | { success: false; error: MetaWebhookError };

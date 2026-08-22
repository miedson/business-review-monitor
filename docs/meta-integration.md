# Meta Integration

## Overview

This document describes the Meta (Instagram/Facebook) integration for the Business Review Monitor.

## OAuth Flow

The Instagram OAuth flow is implemented at:

- `GET /integrations/instagram/connect` - Start OAuth connection
- `GET /integrations/instagram/callback` - Complete OAuth callback
- `GET /integrations/instagram/accounts` - List connected Instagram accounts
- `POST /integrations/instagram/disconnect` - Disconnect Instagram integration

## Meta Webhook

### Callback URL

```
https://api-brm.sixsys.com.br/webhooks/meta
```

### Verify Token

The verify token is configured via the `META_WEBHOOK_VERIFY_TOKEN` environment variable.

**Do not** use the Meta App Secret as the verify token. These are different secrets:

| Secret                      | Purpose                                                 |
| --------------------------- | ------------------------------------------------------- |
| `META_WEBHOOK_VERIFY_TOKEN` | Used only for the initial GET challenge verification    |
| `META_APP_SECRET`           | Used to validate HMAC signatures on POST webhook events |

### GET /webhooks/meta - Challenge Verification

Meta verifies the webhook subscription by sending a GET request with query parameters:

```
GET /webhooks/meta?hub.mode=subscribe&hub.verify_token=<TOKEN>&hub.challenge=<CHALLENGE>
```

**Verification flow:**

1. Check `hub.mode === "subscribe"`
2. Compare `hub.verify_token` with `META_WEBHOOK_VERIFY_TOKEN` using timing-safe comparison
3. If valid, respond with HTTP 200 and the exact `hub.challenge` value as `text/plain`
4. If invalid, respond with HTTP 403

**Example successful response:**

```
HTTP 200
Content-Type: text/plain

123456789
```

### POST /webhooks/meta - Event Reception

Meta sends real-time events to this endpoint.

**Signature validation:**

- Header: `X-Hub-Signature-256`
- Algorithm: HMAC-SHA256
- Key: `META_APP_SECRET`
- Payload: Raw request body (not JSON.stringify)

**Validation flow:**

1. Read `X-Hub-Signature-256` header
2. Compute HMAC-SHA256 of raw body using `META_APP_SECRET`
3. Compare using timing-safe comparison
4. If valid, process payload and respond HTTP 200
5. If invalid, respond HTTP 401

**Response:**

```json
{
  "received": true
}
```

### Supported Events

The webhook currently accepts and logs the following event types:

- `instagram` - Instagram events (comments, mentions, messages)

Events are enqueued to the `meta-webhook-events` BullMQ queue for async processing.

### Queue

- **Queue name**: `meta-webhook-events`
- **Job name**: `process-meta-webhook-event`
- **Worker**: `apps/worker`

### Security

- Webhook endpoints are public (no JWT authentication)
- GET verified via `META_WEBHOOK_VERIFY_TOKEN`
- POST verified via HMAC-SHA256 using `META_APP_SECRET`
- Secrets are never logged
- Raw body is not logged
- Timing-safe comparison used for all secret comparisons

### Meta Developers Configuration

In Meta Developers portal:

1. Go to your App > Webhooks
2. Add Callback URL: `https://api-brm.sixsys.com.br/webhooks/meta`
3. Verify Token: Value of `META_WEBHOOK_VERIFY_TOKEN`
4. Subscribe to Instagram fields:
   - `comments`
   - `mentions`
   - `messages` (if using Instagram Messaging)
5. Click "Verify and Save"

### Environment Variables

| Variable                      | Description                              | Required |
| ----------------------------- | ---------------------------------------- | -------- |
| `META_WEBHOOK_VERIFY_TOKEN`   | Token for GET challenge verification     | Yes      |
| `META_APP_SECRET`             | App Secret for POST signature validation | Yes      |
| `META_APP_ID`                 | Meta App ID                              | Yes      |
| `META_INSTAGRAM_REDIRECT_URI` | OAuth redirect URI                       | Yes      |
| `META_GRAPH_API_VERSION`      | Graph API version (default: v21.0)       | No       |

### Testing Locally

Before configuring in Meta Developers, test manually:

```bash
# Test challenge verification
curl "http://localhost:3333/webhooks/meta?hub.mode=subscribe&hub.verify_token=<YOUR_VERIFY_TOKEN>&hub.challenge=123456"

# Expected: HTTP 200, body: "123456"

# Test invalid token
curl "http://localhost:3333/webhooks/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123456"

# Expected: HTTP 403
```

### Idempotency

Webhooks may be redelivered. The system identifies events by:

- `entry.id` + `entry.time`
- `change.field` + `change.value.*_id`

Future deduplication will use these identifiers.

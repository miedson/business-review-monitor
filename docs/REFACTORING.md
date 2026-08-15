# Refactoring Guide

## Policy

The project is at an early stage.

Substantial refactoring is allowed and encouraged when existing structure conflicts with Hexagonal Architecture.

The goal is to converge quickly on one coherent architecture.

## Before refactoring

Run:

```bash
pnpm graphify:build
```

Inspect:

- feature entry points;
- package relationships;
- call chains;
- database/client access;
- provider integrations;
- cross-app duplication;
- cycles;
- current tests.

When practical, establish a baseline:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

If baseline commands already fail, report those failures separately from failures introduced by the change.

## Refactoring sequence

### 1. Identify the business capability

Do not refactor only by technical folder.

Name the capability being migrated.

### 2. Find business rules

Inspect current:

- API handlers;
- workers;
- services;
- repositories;
- database code;
- integrations.

Move business decisions toward Domain/Application.

### 3. Define use cases

Extract explicit application operations.

The same business operation should be reusable by multiple inbound mechanisms when appropriate.

Example:

```text
API -> SyncReviews
Worker -> SyncReviews
```

rather than duplicating synchronization behavior.

### 4. Extract outbound ports

Any core dependency on an external capability becomes a candidate port.

Examples:

```text
ReviewProvider
ReviewRepository
BusinessRepository
NotificationPublisher
Clock
```

Do not create ports for pure internal helpers without a boundary reason.

### 5. Build/move outbound adapters

Move concrete integrations to outer layers/packages.

### 6. Thin inbound adapters

API/worker/web entry points should invoke use cases rather than orchestrate business behavior.

### 7. Establish composition roots

Instantiate concrete dependencies in app/bootstrap/infrastructure code.

### 8. Remove obsolete structure

Delete:

- old services;
- direct DB/provider calls;
- unused interfaces;
- duplicate paths;
- unnecessary compatibility wrappers;
- dead exports.

### 9. Verify package boundaries

Rebuild:

```bash
pnpm graphify:build
```

Inspect for:

- cycles;
- forbidden imports;
- cross-layer leakage;
- old code still referenced.

### 10. Run quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Common migrations

### Fat worker

Before:

```text
worker job
  -> DB
  -> external reviews API
  -> comparison logic
  -> DB
  -> notification
```

After:

```text
worker job
  -> SyncBusinessReviews use case
      -> Domain comparison rules
      -> ReviewProvider port
      -> ReviewRepository port
      -> NotificationPublisher port
```

### Fat API route

Before:

```text
route
  -> database
  -> business validation
  -> provider SDK
  -> response
```

After:

```text
route
  -> use case
      -> domain
      -> ports
```

### Vendor-specific core

Before:

```text
SyncReviews
  -> VendorSDK
```

After:

```text
SyncReviews
  -> ReviewProvider

VendorReviewProvider implements ReviewProvider
```

### Database-generated models everywhere

Before:

```text
GeneratedBusinessModel
  used in route
  used in service
  used in domain logic
```

After:

```text
DB model
   |
database adapter mapping
   |
Domain/Application model
```

## Rewrite threshold

A complete rewrite of a small feature is acceptable when:

- responsibilities are deeply mixed;
- incremental migration would preserve duplicated architecture;
- call sites are limited;
- behavior can be protected by tests;
- the new implementation is materially simpler.

## Definition of migrated

A feature is migrated when:

- business rules are independent of frameworks;
- a clear application use case owns orchestration;
- external dependencies are ports;
- concrete technologies are adapters;
- API/web/worker entry points are thin;
- direct DB/vendor dependencies no longer leak inward;
- old architecture for that feature is removed;
- tests pass;
- Graphify shows acceptable dependency direction.

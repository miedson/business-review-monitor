# Architecture

## Architectural style

This monorepo uses **Hexagonal Architecture (Ports and Adapters)**.

The primary goal is to keep business behavior independent from API frameworks, web frameworks, worker infrastructure, databases, ORMs, vendors and external APIs.

The architecture is defined by dependency direction, not merely directory naming.

## Monorepo model

The repository contains:

```text
apps/
packages/
```

Based on the project scripts, runtime applications include at least:

```text
apps/api
apps/web
apps/worker
```

Confirm exact directories from the repository before modifying them.

### Apps

`apps/*` are composition/delivery units.

They may contain:

- framework bootstrap;
- HTTP/web adapters;
- workers/consumers;
- runtime configuration;
- dependency injection/composition roots;
- application-specific presentation concerns.

Apps should not become the permanent home of reusable/core business logic.

### Packages

Prefer packages organized around cohesive business capabilities.

For an early-stage monorepo, feature-oriented Hexagonal modules are preferred over global layer packages when they improve cohesion.

Example:

```text
packages/
  review-monitoring/
    src/
      domain/
      application/
      ports/
      adapters/
```

Potential target shape:

```text
apps/
  api/
    src/
      bootstrap/
      adapters/
        inbound/
          http/

  web/
    src/
      ...

  worker/
    src/
      bootstrap/
      adapters/
        inbound/
          jobs/

packages/
  review-monitoring/
    src/
      domain/
        entities/
        value-objects/
        services/
        events/
        errors/

      application/
        use-cases/
        dto/

      ports/
        outbound/

      adapters/
        outbound/

  database/
    src/

  shared/
    src/
```

Do not force this exact tree if the actual repository suggests a better cohesive organization.

## Dependency direction

```text
                    apps/api
                    apps/web
                  apps/worker
                       |
                       v
                Inbound Adapters
                       |
                       v
                 Application
                       |
              +--------+--------+
              |                 |
              v                 v
            Domain         Outbound Ports
                                ^
                                |
                         Outbound Adapters
                                |
                                v
                     DB / APIs / Queues / SaaS
```

Allowed:

```text
Adapters -> Application -> Domain
Application -> Ports
Outbound Adapters -> Ports
```

Forbidden:

```text
Domain -> Adapter
Domain -> Database
Application -> Concrete Repository
Application -> Vendor SDK
Domain -> HTTP types
```

## Provider isolation

External review platforms/providers are infrastructure concerns.

Target:

```text
Application Use Case
        |
        v
   ReviewProvider
        ^
        |
  +-----+------+
  |            |
Provider A   Provider B
 Adapter     Adapter
```

If provider behavior varies substantially, Strategy may naturally emerge through multiple `ReviewProvider` implementations.

## Persistence isolation

Target:

```text
Use Case
   |
   v
ReviewRepository
   ^
   |
Database Adapter
   |
   v
ORM / DB Client
```

Generated database types remain at the adapter boundary.

## Worker architecture

`apps/worker` is an inbound delivery mechanism.

A worker/job handler should:

```text
receive job
-> validate/map payload
-> call use case
-> handle transport-specific acknowledgement/retry behavior
```

It should not contain domain rules.

## API architecture

`apps/api` is an inbound adapter/composition application.

HTTP handlers/controllers/routes should:

```text
request
-> parse/validate
-> map
-> use case
-> map result/error
-> response
```

No repository/database/external provider calls directly from route handlers.

## Web architecture

`apps/web` may contain presentation/UI logic.

When server-side actions/loaders perform business operations, treat them as inbound adapters and route business behavior through use cases.

Do not duplicate business rules in frontend components.

## Ports

Outbound ports represent capabilities required by the core.

Examples:

```text
ReviewProvider
BusinessRepository
ReviewRepository
NotificationPublisher
Clock
IdGenerator
```

Actual method contracts should be driven by use cases.

Explicit inbound port interfaces are optional. A use-case class/function may itself be the inbound application API.

## Composition root

Concrete dependencies are wired at the outer edge.

Example:

```text
Database client
   -> repository adapter

External API SDK
   -> ReviewProvider adapter

Adapters
   -> use case

Use case
   -> API route / worker handler
```

Use cases must not instantiate infrastructure dependencies themselves.

## Package dependency rules

Avoid:

```text
domain -> database
application -> apps/api
core -> apps/worker
shared -> everything
```

Be especially careful with `shared`.

It must not become a dumping ground that creates cycles.

## Architecture smells

Actively refactor:

- API route imports ORM/database client;
- worker handler imports ORM directly;
- application service imports vendor SDK;
- domain model uses generated database types;
- giant generic `*Service`;
- generic CRUD repository unrelated to use-case needs;
- repeated provider `if/else`;
- duplicated business rules in API/worker/web;
- `shared` containing arbitrary business logic;
- package cycles;
- adapters importing each other to reach business functionality.

## Fitness checks

Ask:

- Can Domain tests run without DB/API/framework initialization?
- Can use cases run with in-memory fakes?
- Can the review provider be replaced without changing business rules?
- Can persistence technology change without rewriting use cases?
- Can worker and API invoke the same use case?
- Does Graphify show inward dependency direction?
- Are package boundaries cohesive?

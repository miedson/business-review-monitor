# Business Review Monitor Agent Notes

## Graphify

Use Graphify as the project memory for code structure.

- The CLI is installed from the official Python package: `pip install graphifyy`.
- The local skill is installed at `.agents/skills/graphify`.
- The current graph lives at `graphify-out/graph.json`.
- Before broad code exploration, prefer:

```bash
graphify query <symbol-or-topic> --graph graphify-out/graph.json
```

- After editing TypeScript source files under `apps/` or `packages/`, update the graph:

```bash
pnpm graphify:build
```

This project is being built incrementally. Do not advance SaaS tasks without explicit user authorization.

# AGENTS.md

## Project context

This repository is a TypeScript ESM monorepo managed with pnpm.

Important project commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm graphify:build
pnpm graphify:check
pnpm db:generate
pnpm db:migrate
pnpm db:studio
pnpm dev:api
pnpm dev:web
pnpm dev:worker
```

Graphify extracts code relationships from:

```text
apps/
packages/
```

The generated graph is stored in:

```text
graphify-out/graph.json
```

## Architectural target

This repository adopts **Hexagonal Architecture (Ports and Adapters)** as its default architecture.

The project is still in an early stage.

Architectural consistency is more important than preserving the current internal structure.

When existing code violates these guidelines, the agent is explicitly authorized to refactor it, including:

- moving files between `apps/` and `packages/`;
- reorganizing packages;
- renaming modules, classes, interfaces, functions and files;
- extracting domain models;
- extracting application use cases;
- introducing meaningful ports;
- creating inbound and outbound adapters;
- replacing direct database access from application/domain code;
- replacing direct external-service access from application/domain code;
- changing internal APIs and updating all call sites;
- replacing framework-driven architecture;
- updating dependency injection/composition;
- updating tests;
- deleting obsolete code and abstractions.

Preserve required product/business behavior, but do not preserve bad internal architecture merely for compatibility with code created during the project's early stage.

## Required reading

Before any non-trivial implementation or refactor, read:

- `docs/ARCHITECTURE.md`
- `docs/ENGINEERING_STANDARDS.md`
- `docs/REFACTORING.md`

If a more specific `AGENTS.md` exists in a subdirectory, follow it for files in that scope.

## Priority order

Optimize decisions in this order:

1. Correctness
2. Domain integrity
3. Architectural consistency
4. Simplicity
5. Clear boundaries
6. Low coupling and high cohesion
7. Testability
8. Maintainability
9. SOLID
10. Appropriate design patterns
11. Performance when justified

Design patterns are tools, not goals.

Never introduce a pattern when a simpler implementation is equally maintainable.

## Monorepo policy

Treat `apps/` as composition/delivery applications and `packages/` as reusable or core capabilities.

Prefer this direction:

```text
apps/*
  -> application/use cases
  -> domain
  -> ports

apps/* and infrastructure packages
  -> outbound adapter implementations
  -> external libraries/vendors
```

Core business logic should not live in `apps/` merely because an application currently uses it.

When business capabilities are shared, stable, or independently testable, move them into appropriate packages.

Do not create packages solely to satisfy folder symmetry. Create package boundaries when they represent a meaningful architectural or ownership boundary.

## Graphify-first workflow

For every non-trivial feature, refactor, cross-package change, or architectural decision:

1. Run:

```bash
pnpm graphify:build
```

2. Inspect the graph and relevant relationships before editing code.

Use Graphify to identify:

- callers;
- callees;
- package dependencies;
- cross-layer imports;
- interfaces and implementations;
- database access;
- external service access;
- duplicated abstractions;
- dependency cycles;
- entry points;
- code affected by moving or renaming components.

3. Use Graphify queries when useful.

The repository currently exposes:

```bash
pnpm graphify:check
```

4. After substantial refactors, rebuild the graph and inspect the changed area again.

Graphify is a decision-support tool. Do not blindly preserve the current graph if the graph exposes architectural debt.

## Dependency rule

Dependencies point inward.

Conceptually:

```text
Inbound Adapters
       |
       v
Application
       |
       v
Domain

Application
       |
       v
Outbound Ports
       ^
       |
Outbound Adapters / Infrastructure
```

The Domain must not depend on:

- database clients;
- ORMs;
- HTTP frameworks;
- web frameworks;
- queue libraries;
- cloud SDKs;
- external API SDKs;
- filesystem implementations;
- environment variables;
- process globals;
- transport DTOs.

Application code may depend on Domain and port abstractions.

Application code must not depend on concrete outbound adapters.

## TypeScript rules

Use TypeScript deliberately.

### Types

- Prefer explicit domain/application types over loose objects.
- Avoid `any`.
- Use `unknown` at unsafe boundaries and narrow it.
- Avoid type assertions unless the invariant is validated or otherwise guaranteed.
- Do not leak vendor types into Domain/Application.
- Do not leak database model types into Domain/Application.
- Avoid using generated ORM types as domain models.
- Prefer discriminated unions when modeling meaningful finite states.
- Prefer value objects when primitives have business rules.

### Imports

Because the repository uses ESM:

- preserve valid ESM semantics;
- respect the repository's TypeScript/module resolution configuration;
- avoid CommonJS patterns unless an external dependency requires interop.

### Public APIs

Packages should expose intentional public APIs.

Avoid consumers importing arbitrary package internals when an explicit package entry point is appropriate.

Do not create barrel files that introduce cycles or hide problematic dependencies.

## Domain

The Domain owns business rules and invariants.

Good candidates:

- entities;
- value objects;
- aggregates;
- domain services;
- domain events;
- specifications;
- policies;
- domain errors.

Do not place business behavior in:

- API route handlers;
- controllers;
- workers/consumers;
- database repositories;
- ORM schemas;
- external API clients;
- UI components.

## Application

Application represents system use cases.

A use case should:

- model one application capability;
- orchestrate domain behavior;
- invoke outbound ports;
- remain transport-independent;
- remain persistence-independent;
- be testable without real infrastructure.

Avoid giant `*Service` classes containing unrelated use cases.

## Inbound adapters

Expected application entry points may include:

- API endpoints;
- web actions/server handlers;
- worker jobs;
- queue/message consumers;
- CLI commands;
- scheduled jobs.

Inbound adapters:

- parse external input;
- validate protocol-level input;
- map it to application input;
- invoke a use case;
- map the result/error back to the protocol.

They must remain thin.

## Outbound ports

Create ports for meaningful capabilities external to the core.

Likely categories for this project include:

- review provider/gateway;
- business repository;
- review repository;
- monitoring configuration repository;
- notification publisher/sender;
- job scheduler;
- clock;
- ID generator.

Names must express the capability, not the vendor.

Good:

```text
ReviewProvider
BusinessRepository
ReviewRepository
NotificationPublisher
Clock
```

Avoid core abstractions named after a specific vendor.

## Outbound adapters

Concrete implementations belong outside Domain/Application.

Examples:

```text
GoogleReviewProvider
PostgresBusinessRepository
PrismaReviewRepository
EmailNotificationAdapter
QueueNotificationPublisher
```

Use actual technologies found in the repository.

Adapters translate:

- vendor models;
- database models;
- generated types;
- transport structures;
- infrastructure errors.

## Database rules

Database code belongs at the outer boundary.

The core must not depend on:

- generated database clients;
- migration tools;
- ORM entities;
- database-specific errors;
- database transaction objects.

Repositories are shaped by application/domain needs rather than by generic CRUD APIs.

Bad:

```text
BaseRepository<T>
findAll()
create()
update()
delete()
```

when the use cases actually need more specific behavior.

Prefer intent-revealing operations such as:

```text
findBusinessByExternalId(...)
saveReviews(...)
findReviewsSince(...)
listBusinessesDueForSync(...)
```

when those operations reflect real application needs.

Before changing database schemas or generated clients, use the relevant scripts:

```bash
pnpm db:generate
pnpm db:migrate
```

Only create migrations when the task actually requires a schema change.

## Design patterns

Actively consider design patterns when they solve a real design problem.

Especially consider:

- Adapter
- Strategy
- Factory
- Repository
- Specification
- State
- Command
- Facade
- Decorator
- Chain of Responsibility
- Domain Events

Use a pattern only when it improves the design.

## Existing code outside the architecture

Existing non-compliant code is architectural debt to be corrected.

When a task touches non-compliant code:

1. Understand current behavior.
2. Build/inspect the Graphify graph.
3. Identify architectural violations.
4. Define the target boundary.
5. Add characterization tests if needed.
6. Refactor the affected feature to the target architecture.
7. Update all call sites.
8. Remove obsolete implementation.
9. Run verification.
10. Rebuild Graphify when the change is structural.

Because the project is early, a complete feature-level refactor is preferred when incremental migration would leave duplicated or contradictory architecture.

Do not keep both "old architecture" and "new architecture" unless a staged migration is technically necessary.

## Mandatory architecture gate

Before non-trivial coding, determine:

1. What business capability is changing?
2. Which domain concepts are involved?
3. Which use case owns the orchestration?
4. What belongs in Domain?
5. Which external capabilities require outbound ports?
6. Which inbound adapters invoke the use case?
7. Which outbound adapters implement the ports?
8. What code currently violates these boundaries?
9. Which existing abstractions should be kept, replaced or deleted?
10. Is a design pattern justified?
11. What is the simplest compliant solution?
12. Which tests protect the behavior?

Do not start by asking "where should I add this code?"

Start by asking "which responsibility owns this behavior?"

## Testing

Use Vitest.

Preferred test distribution:

```text
Domain             -> unit tests
Application        -> use-case unit tests using fakes/test doubles
Outbound adapters  -> integration tests
Inbound adapters   -> focused adapter/contract tests
Critical flows     -> limited end-to-end tests
```

Tests should verify observable behavior.

Prefer lightweight fakes over extensive mocking when they produce clearer tests.

## Required verification

Before completing non-trivial work, run as applicable:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

For structural/architectural work also run:

```bash
pnpm graphify:build
```

and inspect the graph for boundary violations/cycles.

Do not claim verification succeeded if a command was not actually executed.

## Completion gate

Before completing the task, verify:

- Domain has no infrastructure/framework/vendor imports.
- Application has no concrete infrastructure dependencies.
- Business rules are not in API/web/worker adapters.
- External providers are isolated behind meaningful ports where appropriate.
- Database models/types do not leak into the core.
- Vendor API types do not leak into the core.
- Controllers/handlers/workers are thin.
- Touched architectural debt has been removed when practical.
- No obsolete duplicate implementation remains.
- No unjustified interface/factory/abstraction was introduced.
- Names express business intent.
- Tests cover changed behavior.
- `pnpm lint` passes.
- `pnpm typecheck` passes.
- `pnpm test` passes.
- Structural changes were checked with Graphify.

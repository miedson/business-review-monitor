# Engineering Standards

## Stack

This repository uses:

- TypeScript
- ESM
- pnpm
- Vitest
- ESLint
- TypeScript project builds

Follow the repository's actual tsconfig and workspace configuration.

## Required commands

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Structural changes should also run:

```bash
pnpm graphify:build
```

## Clean Code

Use business/domain terminology.

Avoid vague names such as:

```text
Manager
Helper
Utils
Common
Processor
DataService
```

unless they accurately describe a narrow responsibility.

Functions should:

- do one conceptual thing;
- have intention-revealing names;
- avoid hidden side effects;
- avoid excessive parameters;
- stay at one abstraction level.

Modules should be cohesive.

Do not let `index.ts`, `utils.ts`, `service.ts`, or `shared.ts` become dependency magnets.

## TypeScript

- Avoid `any`.
- Use `unknown` at unsafe boundaries and narrow it.
- Do not leak ORM/vendor types into Domain/Application.
- Prefer discriminated unions for meaningful finite states.
- Prefer value objects when primitives have business rules.
- Avoid unnecessary type assertions.
- Preserve ESM semantics.

## SOLID

Apply SOLID pragmatically.

- SRP: one primary reason to change.
- OCP: use composition when behavior truly varies.
- LSP: implementations honor port contracts.
- ISP: focused interfaces/ports.
- DIP: core depends on abstractions, outer layers implement them.

## Design patterns

Patterns should solve a concrete pressure.

Prefer:

```text
Adapter        -> external technology boundary
Strategy       -> varying algorithms/providers
Repository     -> persistence boundary
Factory        -> meaningful construction/selection
Specification  -> composable business predicates
State          -> lifecycle-dependent behavior
Facade         -> complex vendor subsystem
Decorator      -> orthogonal behavior when justified
```

Avoid pattern stacking and speculative abstractions.

## Errors

- Domain errors represent business invariant failures.
- Application errors represent use-case failures.
- Adapters translate protocol/vendor/database failures.

Do not throw HTTP-specific or database-specific errors from Domain/Application.

## Configuration

Environment variables belong at the outer edge.

Parse and validate configuration during bootstrap.

Do not read `process.env` throughout Domain/Application.

## Testing with Vitest

Prefer:

```text
domain tests        -> pure unit tests
use-case tests      -> fakes/stubs for ports
adapter tests       -> integration tests
```

Avoid overmocking.

Tests should describe behavior, e.g.:

```text
it("stores newly discovered reviews")
it("does not notify when no review changed")
```

## Refactoring

Because the repository is early-stage:

- fix architecture now;
- remove obsolete code;
- update consumers rather than preserving needless compatibility;
- perform complete feature-level migrations when cleaner;
- do not leave duplicate architecture without a technical reason.

## Review questions

- Is the responsibility in the correct layer?
- Does this import point inward?
- Is a vendor/DB concern leaking inward?
- Could this be tested without infrastructure?
- Is the abstraction justified?
- Are business terms clear?
- Does a pattern solve a real problem?
- Can the code be simpler?

## API Documentation

All API endpoints must be documented through Fastify OpenAPI schemas at the
route declaration. The development Swagger UI is available only outside
production at `/dev/docs`.

When adding or changing an endpoint:

- add or update the route `schema`;
- keep Zod validation for runtime input validation when applicable;
- do not expose secrets, tokens, authorization codes, passwords, or Google
  credentials in examples or responses;
- update the Swagger coverage test if the endpoint list changes.

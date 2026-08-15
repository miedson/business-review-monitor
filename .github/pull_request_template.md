## Summary

Describe the business/application change.

## Architecture

- [ ] Dependency direction remains `Adapters/Infrastructure -> Application -> Domain`
- [ ] Domain is free from framework/infrastructure concerns
- [ ] Application does not depend on concrete adapters
- [ ] External capabilities are behind meaningful ports
- [ ] Controllers/handlers/resolvers/consumers are thin
- [ ] Business logic is in Domain/Application
- [ ] Existing non-compliant code in the touched area was refactored when practical
- [ ] No obsolete/duplicate implementation remains

## Design

- [ ] Responsibilities are cohesive
- [ ] Names reflect domain intent
- [ ] Composition is preferred over inheritance
- [ ] Design patterns are used only where justified
- [ ] No speculative abstraction was added
- [ ] No avoidable duplication was introduced

## Verification

- [ ] Unit tests pass
- [ ] Integration tests pass where relevant
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Build passes
- [ ] Relevant architecture documentation was updated

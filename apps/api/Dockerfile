FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/review-monitoring/package.json packages/review-monitoring/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile --prod

FROM base AS dev-deps
ENV NODE_ENV=development
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/review-monitoring/package.json packages/review-monitoring/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile

FROM dev-deps AS build
ENV NODE_ENV=production
COPY apps apps
COPY packages packages
RUN pnpm --filter @brm/database db:generate
RUN pnpm --filter @brm/config build
RUN pnpm --filter @brm/database build
RUN pnpm --filter @brm/shared build
RUN pnpm --filter @brm/review-monitoring build
RUN pnpm --filter @brm/api typecheck
RUN pnpm --filter @brm/api build

FROM dev-deps AS development
ENV NODE_ENV=development
COPY apps/api apps/api
COPY packages packages
EXPOSE 3333
CMD ["sh", "-c", "pnpm --filter @brm/database db:generate && pnpm --filter @brm/config build && pnpm --filter @brm/database build && pnpm --filter @brm/shared build && pnpm --filter @brm/review-monitoring build && pnpm --filter @brm/api dev"]

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3333
CMD ["pnpm", "--filter", "@brm/api", "start"]
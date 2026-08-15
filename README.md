# Business Review Monitor

Micro-SaaS para conectar um Google Business Profile e acompanhar avaliações do Google.

## Status

TAREFA 01 concluira somente a fundacao do monorepo. Ainda nao ha Docker, banco, autenticacao, OAuth, Google APIs, worker real ou dashboard.

## Estrutura

```text
apps/
  web/
  api/
  worker/
packages/
  database/
  config/
  shared/
  ui/
```

## Desenvolvimento

Instale dependencias:

```bash
pnpm install
```

Verificacoes:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Docker

Ambiente de desenvolvimento:

```bash
docker compose up -d postgres redis
docker compose ps
docker compose down
```

Servicos locais:

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Compose de producao/Coolify:

```bash
docker compose --env-file .env.production.example -f docker-compose.prod.yml config
```

O compose de producao nao expoe PostgreSQL ou Redis publicamente. No Coolify, configure as variaveis `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`, `REDIS_PASSWORD` e `REDIS_URL` como secrets/variables do projeto. Nao use os valores de exemplo em producao.

## Database

O Prisma fica em `packages/database`.

Gerar Prisma Client:

```bash
pnpm db:generate
```

Aplicar migrations em desenvolvimento:

```bash
pnpm db:migrate --name <nome-da-migration>
```

Validar schema:

```bash
pnpm --filter @brm/database db:validate
```

## Configuracao

A validacao de variaveis de ambiente fica em `packages/config` e usa Zod.

Use `loadConfig()` nos entrypoints das aplicacoes quando API, web e worker forem implementados:

```ts
import { loadConfig } from "@brm/config";

const config = loadConfig();
```

Erros de configuracao informam apenas os nomes das variaveis invalidas, sem expor secrets.

## API

Executar a API em desenvolvimento:

```bash
pnpm dev:api
```

Endpoints implementados:

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

O refresh token e enviado em cookie HttpOnly. O access token volta no corpo da resposta para uso temporario do cliente.

No registro, a API cria automaticamente:

- `User`
- `Tenant`
- `TenantUser` com papel `OWNER`

As respostas de autenticacao retornam `user` e `tenant`, preparando as proximas rotas de dominio para sempre consultarem dados por `tenantId`.

## Seguranca

O pacote `@brm/shared` expoe `EncryptionService` para criptografia autenticada
AES-256-GCM. A chave deve vir de `TOKEN_ENCRYPTION_KEY` em base64 e decodificar
exatamente 32 bytes.

Uso previsto nas proximas etapas: criptografar refresh tokens recebidos do
Google OAuth antes de qualquer persistencia. Tokens nao devem ser enviados ao
frontend nem aparecer em logs, respostas HTTP ou mensagens de erro.

## Google Business Profile

O pacote `@brm/review-monitoring` concentra o core da capacidade de
monitoramento. Ele segue a organizacao hexagonal inicial:

- `domain`: tipos de negocio para perfis, locations e reviews;
- `application/ports`: port `BusinessProfileReviewProvider`;
- `adapters/google`: adapters relacionados ao Google Business Profile.

O adapter `GoogleBusinessProfileMockProvider` permite desenvolvimento e testes
sem chamadas externas, simulando OAuth conectado, contas, locations, reviews,
paginacao e cenarios de erro. Ainda nao ha rotas OAuth, callback HTTP ou
persistencia de tokens.

O adapter `GoogleBusinessProfileApiProvider` implementa a parte real do OAuth
2.0 web server flow: URL de autorizacao, troca de authorization code, refresh de
access token e revogacao de autorizacao. Ele ainda nao implementa chamadas reais
para accounts, locations ou reviews.

## Graphify

Graphify esta configurado para manter um indice estrutural do codigo em `graphify-out/`.

Instalacao do CLI:

```bash
pip install graphifyy
```

Gerar ou atualizar o indice:

```bash
pnpm graphify:build
```

Consultar o grafo:

```bash
graphify query apiAppName --graph graphify-out/graph.json
```

## Etapas concluidas

- TAREFA 01: estrutura do monorepo.
- TAREFA 02: Docker para desenvolvimento e producao.
- TAREFA 03: Prisma + modelo inicial.
- TAREFA 04: configuracao ENV + Zod.
- TAREFA 05: autenticacao propria do SaaS.
- TAREFA 06: tenant inicial e isolamento multi-tenant basico.
- TAREFA 07: EncryptionService AES-256-GCM em `@brm/shared`.
- TAREFA 08: interface `BusinessProfileReviewProvider`.
- TAREFA 09: `GoogleBusinessProfileMockProvider`.
- TAREFA 10: OAuth real no `GoogleBusinessProfileApiProvider`.
## Primeiro deploy em produção

O deploy inicial esperado é via Coolify usando `docker-compose.prod.yml`.

Serviços:

- `web`: Next.js, exposto publicamente.
- `api`: Fastify REST, exposto publicamente para o frontend e callback OAuth.
- `worker`: BullMQ worker interno.
- `postgres`: banco interno, sem exposição pública.
- `redis`: fila/cache interno, sem exposição pública.

Passos mínimos:

1. Criar os domínios públicos, por exemplo `app.seudominio.com` e `api.seudominio.com`.
2. Configurar HTTPS no Coolify para `web` e `api`.
3. Criar as variáveis de ambiente de produção com base em `.env.production.example`.
4. No Google Cloud OAuth Client, cadastrar exatamente `https://api.seudominio.com/integrations/google/callback`.
5. Fazer deploy do compose de produção.
6. Executar migrations Prisma no banco de produção antes do primeiro teste real.
7. Validar `GET https://api.seudominio.com/health`.
8. Criar conta pelo frontend, conectar Google, selecionar empresa e visualizar reviews.

Comando local para validar a configuração do compose:

```bash
docker compose --env-file .env.production.example -f docker-compose.prod.yml config
```

Gerar chave `TOKEN_ENCRYPTION_KEY`:

```bash
openssl rand -base64 32
```

As variáveis `GOOGLE_CLIENT_SECRET`, `JWT_*` e `TOKEN_ENCRYPTION_KEY` nunca devem ser expostas no frontend.

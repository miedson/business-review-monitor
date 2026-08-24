"use client";

import {
  createInstagramAutomation,
  listInstagramAccounts,
  listInstagramAutomationExecutions,
  listInstagramAutomationMedia,
  listInstagramAutomations,
  testInstagramAutomation,
  type InstagramAccount,
  type InstagramAutomation,
  type InstagramAutomationExecution,
  type InstagramAutomationMedia,
} from "@/lib/api-client";
import { getStoredSession } from "@/lib/auth-session";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  EmptyState,
  Flex,
  Input,
  PageHeader,
  Text,
} from "@/lib/design-system";
import { Textarea } from "@chakra-ui/react";
import { Camera, Check, ChevronLeft, ChevronRight, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Tab = "create" | "list";
type MatchType = "ANY_COMMENT" | "CONTAINS" | "EXACT_MATCH" | "FULL_WORD";
type ScopeType = "SPECIFIC_MEDIA" | "ALL_MEDIA";
type MatchTestResult = { matched: boolean; keyword?: string | undefined };

const pageSize = 10;
const nativeControlStyle = {
  width: "100%",
  minHeight: "44px",
  padding: "0 12px",
  border: "1px solid var(--chakra-colors-surface-border-strong)",
  borderRadius: "6px",
  background: "var(--chakra-colors-surface-primary)",
  color: "var(--chakra-colors-text-primary)",
  fontSize: "14px",
  outline: "none",
};

export default function AutomationsPage() {
  const session = getStoredSession();
  const [tab, setTab] = useState<Tab>("create");
  const [automations, setAutomations] = useState<InstagramAutomation[]>([]);
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [media, setMedia] = useState<InstagramAutomationMedia[]>([]);
  const [mediaQuery, setMediaQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [accountId, setAccountId] = useState("");
  const [name, setName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState("");
  const [matchType, setMatchType] = useState<MatchType>("CONTAINS");
  const [testText, setTestText] = useState("");
  const [testResult, setTestResult] = useState<MatchTestResult | null>(null);
  const [scopeType, setScopeType] = useState<ScopeType>("ALL_MEDIA");
  const [selectedMediaId, setSelectedMediaId] = useState("");
  const [excluded, setExcluded] = useState("");
  const [publicReplyEnabled, setPublicReplyEnabled] = useState(false);
  const [publicReply, setPublicReply] = useState("");
  const [executions, setExecutions] = useState<Record<string, InstagramAutomationExecution[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = async (requestedPage = page) => {
    if (!session?.accessToken) return;
    const result = await listInstagramAutomations(session.accessToken, {
      page: requestedPage,
      pageSize,
    });
    setAutomations(result.automations);
    setPage(result.page);
    setTotalPages(result.totalPages);
    setTotal(result.total);
  };

  useEffect(() => {
    if (!session?.accessToken) return;
    void Promise.all([
      listInstagramAccounts(session.accessToken).then((result) => {
        setAccounts(result.accounts);
        setAccountId((current) => current || result.accounts[0]?.connectionId || "");
      }),
      listInstagramAutomationMedia(session.accessToken).then((result) => setMedia(result.media)),
      loadList(1),
    ])
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Não foi possível carregar a tela."),
      )
      .finally(() => setLoading(false));
  }, []);

  const filteredMedia = useMemo(() => {
    const query = mediaQuery.trim().toLocaleLowerCase();
    if (!query) return media;
    return media.filter((item) =>
      `${item.caption ?? ""} ${item.media_type ?? ""} ${item.media_product_type ?? ""}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [media, mediaQuery]);

  async function save() {
    if (!session?.accessToken || !accountId || !name.trim() || !message.trim()) {
      setError("Preencha o nome, a conta do Instagram e a mensagem privada.");
      return;
    }
    if (scopeType === "SPECIFIC_MEDIA" && !selectedMediaId) {
      setError("Selecione uma publicação para usar este escopo.");
      return;
    }
    try {
      setSaving(true);
      await createInstagramAutomation({
        accessToken: session.accessToken,
        name: name.trim(),
        instagramConnectionId: accountId,
        scopeType,
        instagramMediaId: scopeType === "SPECIFIC_MEDIA" ? selectedMediaId : null,
        matchType,
        keywords: splitLines(keyword),
        excludedKeywords: splitLines(excluded),
        dmMessage: message.trim(),
        publicReplyEnabled,
        publicReplyMessages: publicReply
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
        status: "ACTIVE",
      });
      resetForm();
      await loadList(1);
      setTab("list");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a automação.");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setName("");
    setKeyword("");
    setMessage("");
    setExcluded("");
    setPublicReply("");
    setTestText("");
    setTestResult(null);
    setSelectedMediaId("");
  }

  async function test() {
    if (!session?.accessToken || !testText.trim()) return;
    try {
      const result = await testInstagramAutomation({
        accessToken: session.accessToken,
        text: testText,
        matchType,
        keywords: splitLines(keyword),
        excludedKeywords: splitLines(excluded),
      });
      setTestResult(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível testar a regra.");
    }
  }

  async function showExecutions(automationId: string) {
    if (!session?.accessToken) return;
    try {
      const result = await listInstagramAutomationExecutions({
        accessToken: session.accessToken,
        automationId,
      });
      setExecutions((current) => ({ ...current, [automationId]: result.executions }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o histórico.");
    }
  }

  return (
    <Box css={{ maxW: "1160px", mx: "auto" }}>
      <PageHeader
        eyebrow="Automações · Instagram"
        title="Comment-to-DM"
        description="Transforme comentários em conversas automáticas, com regras simples e controle total."
        actions={
          <Button variant="outline" size="sm" onClick={() => void loadList(page)}>
            Atualizar
          </Button>
        }
      />
      {error && (
        <Alert tone="error" dismissible onClose={() => setError(null)} mb={5}>
          {error}
        </Alert>
      )}
      <Flex
        role="tablist"
        css={{ borderBottom: "1px solid", borderColor: "surface.border", gap: 1, mb: 6 }}
      >
        <TabButton active={tab === "create"} onClick={() => setTab("create")}>
          <Sparkles size={16} /> Criar automação
        </TabButton>
        <TabButton active={tab === "list"} onClick={() => setTab("list")}>
          Automações salvas {total > 0 && <span>({total})</span>}
        </TabButton>
      </Flex>
      {tab === "create" ? (
        <CreateAutomation
          accounts={accounts}
          accountId={accountId}
          setAccountId={setAccountId}
          name={name}
          setName={setName}
          scopeType={scopeType}
          setScopeType={setScopeType}
          media={filteredMedia}
          mediaQuery={mediaQuery}
          setMediaQuery={setMediaQuery}
          selectedMediaId={selectedMediaId}
          setSelectedMediaId={setSelectedMediaId}
          matchType={matchType}
          setMatchType={setMatchType}
          keyword={keyword}
          setKeyword={setKeyword}
          excluded={excluded}
          setExcluded={setExcluded}
          publicReplyEnabled={publicReplyEnabled}
          setPublicReplyEnabled={setPublicReplyEnabled}
          publicReply={publicReply}
          setPublicReply={setPublicReply}
          message={message}
          setMessage={setMessage}
          testText={testText}
          setTestText={setTestText}
          testResult={testResult}
          onTest={() => void test()}
          onSave={() => void save()}
          onReset={resetForm}
          saving={saving}
        />
      ) : (
        <AutomationList
          automations={automations}
          executions={executions}
          loading={loading}
          page={page}
          total={total}
          totalPages={totalPages}
          onPageChange={(nextPage) => void loadList(nextPage)}
          onHistory={(id) => void showExecutions(id)}
          onCreate={() => setTab("create")}
        />
      )}
    </Box>
  );
}

function CreateAutomation(props: {
  accounts: InstagramAccount[];
  accountId: string;
  setAccountId: (value: string) => void;
  name: string;
  setName: (value: string) => void;
  scopeType: ScopeType;
  setScopeType: (value: ScopeType) => void;
  media: InstagramAutomationMedia[];
  mediaQuery: string;
  setMediaQuery: (value: string) => void;
  selectedMediaId: string;
  setSelectedMediaId: (value: string) => void;
  matchType: MatchType;
  setMatchType: (value: MatchType) => void;
  keyword: string;
  setKeyword: (value: string) => void;
  excluded: string;
  setExcluded: (value: string) => void;
  publicReplyEnabled: boolean;
  setPublicReplyEnabled: (value: boolean) => void;
  publicReply: string;
  setPublicReply: (value: string) => void;
  message: string;
  setMessage: (value: string) => void;
  testText: string;
  setTestText: (value: string) => void;
  testResult: MatchTestResult | null;
  onTest: () => void;
  onSave: () => void;
  onReset: () => void;
  saving: boolean;
}) {
  return (
    <Card padding="none">
      <CardBody css={{ p: { base: 4, md: 7 } }}>
        <Flex css={{ alignItems: "center", gap: 3, mb: 7 }}>
          <Box
            css={{
              display: "grid",
              placeItems: "center",
              w: 10,
              h: 10,
              bg: "pink.50",
              color: "pink.600",
              borderRadius: "lg",
            }}
          >
            <Camera size={21} />
          </Box>
          <Box>
            <Text css={{ fontWeight: "semibold", fontSize: "lg" }}>Configure sua automação</Text>
            <Text css={{ color: "text.tertiary", fontSize: "sm", mt: 1 }}>
              Defina quando a mensagem deve ser enviada e qual conteúdo usar.
            </Text>
          </Box>
        </Flex>
        <Box css={{ display: "grid", gap: 7 }}>
          <FormSection number="01" title="Identificação">
            <Field label="Nome da automação" hint="Um nome interno para você encontrar depois.">
              <Input
                value={props.name}
                onChange={(event) => props.setName(event.target.value)}
                placeholder="Ex.: Ebook de agosto"
              />
            </Field>
            <Field label="Conta do Instagram">
              <select
                style={nativeControlStyle}
                value={props.accountId}
                onChange={(event) => props.setAccountId(event.target.value)}
              >
                <option value="">Selecione uma conta</option>
                {props.accounts.map((account) => (
                  <option
                    key={account.connectionId ?? account.id}
                    value={account.connectionId ?? account.id}
                  >
                    @{account.username}
                  </option>
                ))}
              </select>
            </Field>
          </FormSection>
          <FormSection number="02" title="Onde aplicar">
            <Box
              css={{ display: "grid", gridTemplateColumns: { base: "1fr", md: "1fr 1fr" }, gap: 3 }}
            >
              <ChoiceCard
                active={props.scopeType === "ALL_MEDIA"}
                onClick={() => props.setScopeType("ALL_MEDIA")}
                title="Todos os posts e Reels"
                description="Ativa para novas publicações também."
              />
              <ChoiceCard
                active={props.scopeType === "SPECIFIC_MEDIA"}
                onClick={() => props.setScopeType("SPECIFIC_MEDIA")}
                title="Publicação específica"
                description="Escolha um post ou Reel existente."
              />
            </Box>
            {props.scopeType === "SPECIFIC_MEDIA" && (
              <Box css={{ mt: 4 }}>
                <Flex css={{ alignItems: "center", gap: 2, mb: 3 }}>
                  <Search size={16} color="var(--chakra-colors-text-tertiary)" />
                  <Input
                    value={props.mediaQuery}
                    onChange={(event) => props.setMediaQuery(event.target.value)}
                    placeholder="Buscar por legenda ou tipo de publicação"
                  />
                </Flex>
                <Box
                  css={{
                    display: "grid",
                    gridTemplateColumns: {
                      base: "1fr",
                      sm: "repeat(2, 1fr)",
                      lg: "repeat(3, 1fr)",
                    },
                    gap: 3,
                    maxH: "320px",
                    overflowY: "auto",
                    pr: 1,
                  }}
                >
                  {props.media.length ? (
                    props.media.map((item) => (
                      <MediaChoice
                        key={item.id}
                        item={item}
                        active={props.selectedMediaId === item.id}
                        onClick={() => props.setSelectedMediaId(item.id)}
                      />
                    ))
                  ) : (
                    <Text css={{ color: "text.tertiary", fontSize: "sm", py: 4 }}>
                      Nenhuma publicação encontrada nos conteúdos recentes.
                    </Text>
                  )}
                </Box>
              </Box>
            )}
          </FormSection>
          <FormSection number="03" title="Gatilho do comentário">
            <Field label="Quando o comentário">
              <select
                style={nativeControlStyle}
                value={props.matchType}
                onChange={(event) => props.setMatchType(event.target.value as MatchType)}
              >
                <option value="CONTAINS">Contiver uma palavra ou frase</option>
                <option value="EXACT_MATCH">For exatamente igual</option>
                <option value="FULL_WORD">Contiver uma palavra completa</option>
                <option value="ANY_COMMENT">For qualquer comentário</option>
              </select>
            </Field>
            <Field label="Palavras-chave" hint="Separe várias palavras por vírgula.">
              <Input
                value={props.keyword}
                onChange={(event) => props.setKeyword(event.target.value)}
                placeholder="Ex.: eu quero, ebook, material"
              />
            </Field>
            <Field
              label="Palavras de exclusão"
              hint="Se alguma aparecer, a automação não será disparada."
            >
              <Input
                value={props.excluded}
                onChange={(event) => props.setExcluded(event.target.value)}
                placeholder="Ex.: não quero"
              />
            </Field>
          </FormSection>
          <FormSection number="04" title="Ação">
            <Field
              label="Mensagem privada"
              hint="Você pode usar {{first_name}}, {{username}} e {{comment_text}}."
            >
              <Textarea
                value={props.message}
                onChange={(event) => props.setMessage(event.target.value)}
                placeholder="Oi {{first_name}}! Aqui está o material que você pediu 👋"
                minH="140px"
              />
            </Field>
            <Box
              css={{
                border: "1px solid",
                borderColor: "surface.border",
                borderRadius: "lg",
                p: 4,
                bg: "surface.secondary",
              }}
            >
              <Flex css={{ alignItems: "center", justifyContent: "space-between", gap: 3 }}>
                <Box>
                  <Text css={{ fontWeight: "medium", fontSize: "sm" }}>Responder publicamente</Text>
                  <Text css={{ color: "text.tertiary", fontSize: "xs", mt: 1 }}>
                    Avise a pessoa que a mensagem foi enviada.
                  </Text>
                </Box>
                <input
                  type="checkbox"
                  checked={props.publicReplyEnabled}
                  onChange={(event) => props.setPublicReplyEnabled(event.target.checked)}
                  aria-label="Responder publicamente"
                />
              </Flex>
              {props.publicReplyEnabled && (
                <Textarea
                  css={{ mt: 3 }}
                  value={props.publicReply}
                  onChange={(event) => props.setPublicReply(event.target.value)}
                  placeholder="Uma resposta por linha"
                  minH="90px"
                />
              )}
            </Box>
          </FormSection>
          <FormSection number="05" title="Teste antes de ativar">
            <Flex css={{ gap: 3, flexDirection: { base: "column", md: "row" } }}>
              <Input
                value={props.testText}
                onChange={(event) => props.setTestText(event.target.value)}
                placeholder="Digite um comentário de exemplo"
              />
              <Button variant="outline" onClick={props.onTest} disabled={!props.testText.trim()}>
                Testar regra
              </Button>
            </Flex>
            {props.testResult && (
              <Alert tone={props.testResult.matched ? "success" : "warning"} mt={3}>
                {props.testResult.matched
                  ? `MATCH${props.testResult.keyword ? ` · ${props.testResult.keyword}` : ""}`
                  : "NO MATCH — este comentário não dispara a automação."}
              </Alert>
            )}
          </FormSection>
          <Flex
            css={{
              justifyContent: "flex-end",
              gap: 3,
              pt: 2,
              borderTop: "1px solid",
              borderColor: "surface.border",
            }}
          >
            <Button variant="outline" onClick={props.onReset}>
              Limpar
            </Button>
            <Button colorPalette="teal" onClick={props.onSave} loading={props.saving}>
              Salvar e ativar
            </Button>
          </Flex>
        </Box>
      </CardBody>
    </Card>
  );
}

function AutomationList(props: {
  automations: InstagramAutomation[];
  executions: Record<string, InstagramAutomationExecution[]>;
  loading: boolean;
  page: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onHistory: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <Card padding="none">
      <CardBody css={{ p: { base: 4, md: 6 } }}>
        <Flex
          css={{
            justifyContent: "space-between",
            alignItems: { base: "flex-start", md: "center" },
            gap: 3,
            flexWrap: "wrap",
            mb: 5,
          }}
        >
          <Box>
            <Text css={{ fontWeight: "semibold", fontSize: "lg" }}>Automações salvas</Text>
            <Text css={{ color: "text.tertiary", fontSize: "sm", mt: 1 }}>
              {props.total}{" "}
              {props.total === 1 ? "automação configurada" : "automações configuradas"}
            </Text>
          </Box>
          <Button colorPalette="teal" size="sm" onClick={props.onCreate}>
            <Sparkles size={15} /> Nova automação
          </Button>
        </Flex>
        {props.loading ? (
          <Text css={{ color: "text.tertiary", py: 8, textAlign: "center" }}>
            Carregando automações…
          </Text>
        ) : props.automations.length === 0 ? (
          <EmptyState
            title="Nenhuma automação criada"
            description="Crie sua primeira regra para transformar comentários em conversas."
            action={{ label: "Criar automação", onClick: props.onCreate }}
            size="sm"
          />
        ) : (
          <Box
            css={{
              border: "1px solid",
              borderColor: "surface.border",
              borderRadius: "lg",
              overflow: "hidden",
            }}
          >
            {props.automations.map((automation) => (
              <AutomationRow
                key={automation.id}
                automation={automation}
                executions={props.executions[automation.id]}
                onHistory={() => props.onHistory(automation.id)}
              />
            ))}
          </Box>
        )}
        {props.totalPages > 1 && (
          <Flex css={{ justifyContent: "space-between", alignItems: "center", mt: 5, gap: 3 }}>
            <Text css={{ color: "text.tertiary", fontSize: "xs" }}>
              Página {props.page} de {props.totalPages}
            </Text>
            <Flex css={{ gap: 2 }}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => props.onPageChange(props.page - 1)}
                disabled={props.page <= 1}
              >
                <ChevronLeft size={15} /> Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => props.onPageChange(props.page + 1)}
                disabled={props.page >= props.totalPages}
              >
                Próxima <ChevronRight size={15} />
              </Button>
            </Flex>
          </Flex>
        )}
      </CardBody>
    </Card>
  );
}

function AutomationRow(props: {
  automation: InstagramAutomation;
  executions?: InstagramAutomationExecution[] | undefined;
  onHistory: () => void;
}) {
  const { automation } = props;
  return (
    <Box
      css={{
        p: 4,
        borderBottom: "1px solid",
        borderColor: "surface.border",
        _last: { borderBottom: "none" },
      }}
    >
      <Flex
        css={{
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 4,
          flexWrap: "wrap",
        }}
      >
        <Box css={{ minW: 0, flex: 1 }}>
          <Flex css={{ alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Text css={{ fontWeight: "semibold" }}>{automation.name}</Text>
            <Badge variant={automation.status === "ACTIVE" ? "success" : "default"} size="sm" dot>
              {automation.status === "ACTIVE"
                ? "Ativa"
                : automation.status === "PAUSED"
                  ? "Pausada"
                  : "Rascunho"}
            </Badge>
          </Flex>
          <Text css={{ color: "text.tertiary", fontSize: "xs", mt: 2 }}>
            {automation.matchType === "ANY_COMMENT" ? "Qualquer comentário" : automation.matchType}{" "}
            ·{" "}
            {automation.scopeType === "ALL_MEDIA"
              ? "Todos os posts e Reels"
              : "Publicação específica"}
          </Text>
          <Flex css={{ gap: 2, mt: 3, flexWrap: "wrap" }}>
            {automation.keywords.map((item) => (
              <Badge key={item} variant="info" size="sm">
                {item}
              </Badge>
            ))}
          </Flex>
        </Box>
        <Button variant="outline" size="sm" onClick={props.onHistory}>
          Histórico
        </Button>
      </Flex>
      {props.executions?.map((execution) => (
        <Box
          key={execution.id}
          css={{ mt: 4, p: 3, bg: "surface.secondary", borderRadius: "md", fontSize: "xs" }}
        >
          <Flex css={{ alignItems: "center", gap: 2 }}>
            <Badge
              variant={
                execution.status === "COMPLETED"
                  ? "success"
                  : execution.status === "FAILED"
                    ? "error"
                    : "warning"
              }
              size="sm"
            >
              {execution.status}
            </Badge>
            <Text css={{ color: "text.tertiary" }}>
              {new Date(execution.createdAt).toLocaleString("pt-BR")}
            </Text>
          </Flex>
          <Text css={{ mt: 2, color: "text.secondary" }}>
            {execution.matchedKeyword ?? "Qualquer comentário"} ·{" "}
            {execution.actionExecutions
              .map((action) => `${action.type}: ${action.status}`)
              .join(" · ")}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

function FormSection(props: { number: string; title: string; children: React.ReactNode }) {
  return (
    <Box
      css={{
        display: "grid",
        gridTemplateColumns: { base: "1fr", md: "150px 1fr" },
        gap: { base: 3, md: 7 },
        alignItems: "start",
      }}
    >
      <Box>
        <Text
          css={{ color: "teal.500", fontSize: "xs", fontWeight: "bold", letterSpacing: "wide" }}
        >
          {props.number}
        </Text>
        <Text css={{ fontWeight: "semibold", mt: 1 }}>{props.title}</Text>
      </Box>
      <Box css={{ display: "grid", gap: 4 }}>{props.children}</Box>
    </Box>
  );
}

function Field(props: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <Box>
      <Text as="label" css={{ display: "block", fontSize: "sm", fontWeight: "medium", mb: 1.5 }}>
        {props.label}
      </Text>
      {props.hint && (
        <Text css={{ color: "text.tertiary", fontSize: "xs", mb: 2 }}>{props.hint}</Text>
      )}
      {props.children}
    </Box>
  );
}

function ChoiceCard(props: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        textAlign: "left",
        padding: "16px",
        border: `1px solid ${props.active ? "var(--chakra-colors-teal-500)" : "var(--chakra-colors-surface-border)"}`,
        borderRadius: "8px",
        background: props.active
          ? "var(--chakra-colors-status-info-bg)"
          : "var(--chakra-colors-surface-primary)",
        color: "var(--chakra-colors-text-primary)",
        transition: "all 150ms ease",
        cursor: "pointer",
      }}
    >
      <Flex css={{ justifyContent: "space-between", gap: 3 }}>
        <Box>
          <Text css={{ fontSize: "sm", fontWeight: "medium" }}>{props.title}</Text>
          <Text css={{ color: "text.tertiary", fontSize: "xs", mt: 1 }}>{props.description}</Text>
        </Box>
        {props.active && <Check size={17} color="var(--chakra-colors-teal-500)" />}
      </Flex>
    </button>
  );
}

function MediaChoice(props: {
  item: InstagramAutomationMedia;
  active: boolean;
  onClick: () => void;
}) {
  const { item } = props;
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        textAlign: "left",
        overflow: "hidden",
        border: `2px solid ${props.active ? "var(--chakra-colors-teal-500)" : "var(--chakra-colors-surface-border)"}`,
        borderRadius: "8px",
        background: "var(--chakra-colors-surface-primary)",
        color: "var(--chakra-colors-text-primary)",
        cursor: "pointer",
      }}
    >
      <Box css={{ position: "relative", aspectRatio: "1.45", bg: "surface.tertiary" }}>
        {item.thumbnail_url || item.media_url ? (
          <img
            src={item.thumbnail_url || item.media_url}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Flex
            css={{
              h: "100%",
              alignItems: "center",
              justifyContent: "center",
              color: "text.tertiary",
            }}
          >
            <Camera size={22} />
          </Flex>
        )}
        {props.active && (
          <Box
            css={{
              position: "absolute",
              top: 2,
              right: 2,
              display: "grid",
              placeItems: "center",
              w: 6,
              h: 6,
              borderRadius: "full",
              bg: "teal.500",
              color: "white",
            }}
          >
            <Check size={14} />
          </Box>
        )}
      </Box>
      <Box css={{ p: 3 }}>
        <Text css={{ fontSize: "xs", fontWeight: "medium" }}>
          {item.media_product_type ?? item.media_type ?? "Instagram"}
        </Text>
        <Text
          css={{
            color: "text.tertiary",
            fontSize: "xs",
            mt: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.caption || "Sem legenda"}
        </Text>
      </Box>
    </button>
  );
}

function TabButton(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={props.active}
      onClick={props.onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px",
        marginBottom: "-1px",
        border: "none",
        borderBottom: `2px solid ${props.active ? "var(--chakra-colors-teal-500)" : "transparent"}`,
        background: "transparent",
        color: props.active
          ? "var(--chakra-colors-text-primary)"
          : "var(--chakra-colors-text-tertiary)",
        fontSize: "14px",
        fontWeight: props.active ? 600 : 500,
        transition: "all 150ms ease",
        cursor: "pointer",
      }}
    >
      {props.children}
    </button>
  );
}

function splitLines(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

"use client";

import {
  createInstagramAutomation,
  listInstagramAccounts,
  listInstagramAutomationExecutions,
  listInstagramAutomationMedia,
  listInstagramAutomations,
  testInstagramAutomation,
  type InstagramAutomation,
  type InstagramAutomationExecution,
  type InstagramAutomationMedia,
} from "@/lib/api-client";
import { getStoredSession } from "@/lib/auth-session";
import { Button, Input, Textarea } from "@chakra-ui/react";
import { useEffect, useState } from "react";

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<InstagramAutomation[]>([]);
  const [accountId, setAccountId] = useState("");
  const [name, setName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState("");
  const [matchType, setMatchType] = useState<
    "ANY_COMMENT" | "CONTAINS" | "EXACT_MATCH" | "FULL_WORD"
  >("CONTAINS");
  const [testText, setTestText] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [media, setMedia] = useState<InstagramAutomationMedia[]>([]);
  const [scopeType, setScopeType] = useState<"SPECIFIC_MEDIA" | "ALL_MEDIA">("ALL_MEDIA");
  const [selectedMediaId, setSelectedMediaId] = useState("");
  const [excluded, setExcluded] = useState("");
  const [publicReplyEnabled, setPublicReplyEnabled] = useState(false);
  const [publicReply, setPublicReply] = useState("");
  const [executions, setExecutions] = useState<Record<string, InstagramAutomationExecution[]>>({});
  const session = getStoredSession();

  async function load() {
    if (!session?.accessToken) return;
    const [listed, accounts, recentMedia] = await Promise.all([
      listInstagramAutomations(session.accessToken),
      listInstagramAccounts(session.accessToken),
      listInstagramAutomationMedia(session.accessToken),
    ]);
    setAutomations(listed.automations);
    setMedia(recentMedia.media);
    setAccountId((current) => current || accounts.accounts[0]?.connectionId || "");
  }
  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (!session?.accessToken || !accountId || !name || !message) return;
    await createInstagramAutomation({
      accessToken: session.accessToken,
      name,
      instagramConnectionId: accountId,
      scopeType,
      instagramMediaId: scopeType === "SPECIFIC_MEDIA" ? selectedMediaId : null,
      matchType,
      keywords: keyword
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      excludedKeywords: excluded
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      dmMessage: message,
      publicReplyEnabled,
      publicReplyMessages: publicReply
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
      status: "ACTIVE",
    });
    setName("");
    setKeyword("");
    setMessage("");
    setExcluded("");
    setPublicReply("");
    await load();
  }
  async function showExecutions(automationId: string) {
    if (!session?.accessToken) return;
    const result = await listInstagramAutomationExecutions({
      accessToken: session.accessToken,
      automationId,
    });
    setExecutions((current) => ({ ...current, [automationId]: result.executions }));
  }
  async function test() {
    if (!session?.accessToken) return;
    const result = await testInstagramAutomation({
      accessToken: session.accessToken,
      text: testText,
      matchType,
      keywords: keyword
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      excludedKeywords: [],
    });
    setTestResult(
      result.matched ? `MATCH${result.keyword ? ` · ${result.keyword}` : ""}` : "NO MATCH",
    );
  }

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
        }}
      >
        <div>
          <p style={{ color: "#64748b", marginBottom: 6 }}>AUTOMAÇÕES</p>
          <h1 style={{ fontSize: 30, fontWeight: 700 }}>Instagram Comment-to-DM</h1>
          <p style={{ color: "#64748b" }}>Transforme comentários em conversas automaticamente.</p>
        </div>
      </div>
      <section
        style={{
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 650, marginBottom: 18 }}>Criar automação</h2>
        <div style={{ display: "grid", gap: 14 }}>
          <Input
            placeholder="Nome da automação"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <select
            value={scopeType}
            onChange={(event) => setScopeType(event.target.value as typeof scopeType)}
            style={{ padding: 10, border: "1px solid #cbd5e1", borderRadius: 6 }}
          >
            <option value="ALL_MEDIA">Todos os posts e Reels</option>
            <option value="SPECIFIC_MEDIA">Post ou Reel específico</option>
          </select>
          {scopeType === "SPECIFIC_MEDIA" && (
            <select
              value={selectedMediaId}
              onChange={(event) => setSelectedMediaId(event.target.value)}
              style={{ padding: 10, border: "1px solid #cbd5e1", borderRadius: 6 }}
            >
              <option value="">Selecione uma publicação</option>
              {media.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.media_product_type ?? item.media_type ?? "Instagram"} ·{" "}
                  {(item.caption ?? "Sem legenda").slice(0, 60)}
                </option>
              ))}
            </select>
          )}
          <select
            value={matchType}
            onChange={(event) => setMatchType(event.target.value as typeof matchType)}
            style={{ padding: 10, border: "1px solid #cbd5e1", borderRadius: 6 }}
          >
            <option value="CONTAINS">Comentário contém</option>
            <option value="EXACT_MATCH">Correspondência exata</option>
            <option value="FULL_WORD">Palavra completa</option>
            <option value="ANY_COMMENT">Qualquer comentário</option>
          </select>
          <Input
            placeholder="Palavras-chave (separe por vírgula)"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Input
            placeholder="Exclusões (separe por vírgula)"
            value={excluded}
            onChange={(event) => setExcluded(event.target.value)}
          />
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={publicReplyEnabled}
              onChange={(event) => setPublicReplyEnabled(event.target.checked)}
            />{" "}
            Responder publicamente ao comentário
          </label>
          {publicReplyEnabled && (
            <Textarea
              placeholder="Uma resposta por linha"
              value={publicReply}
              onChange={(event) => setPublicReply(event.target.value)}
            />
          )}
          <Textarea
            placeholder="Mensagem privada · use {{first_name}}, {{username}} e {{comment_text}}"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            minH="130px"
          />
          <div style={{ display: "flex", gap: 10 }}>
            <Button colorPalette="blue" onClick={() => void save()}>
              Salvar e ativar
            </Button>
            <Button variant="outline" onClick={() => void test()}>
              Testar regra
            </Button>
          </div>
          {testResult && (
            <p
              style={{
                color: testResult.startsWith("MATCH") ? "#15803d" : "#b45309",
                fontWeight: 600,
              }}
            >
              Teste: {testResult}
            </p>
          )}
          <Input
            placeholder="Digite um comentário para testar"
            value={testText}
            onChange={(event) => setTestText(event.target.value)}
          />
        </div>
      </section>
      <section
        style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 650, marginBottom: 18 }}>Suas automações</h2>
        {automations.length === 0 ? (
          <p style={{ color: "#64748b" }}>Nenhuma automação criada ainda.</p>
        ) : (
          automations.map((automation) => (
            <div key={automation.id}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "15px 0",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <strong>{automation.name}</strong>
                  <div style={{ color: "#64748b", fontSize: 14 }}>
                    {automation.matchType} · {automation.scopeType} ·{" "}
                    {automation.keywords.join(", ") || "qualquer comentário"}
                  </div>
                </div>
                <span
                  style={{
                    color: automation.status === "ACTIVE" ? "#15803d" : "#64748b",
                    fontWeight: 600,
                  }}
                >
                  {automation.status}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void showExecutions(automation.id)}
                >
                  Histórico
                </Button>
              </div>
              {executions[automation.id]?.map((execution) => (
                <div
                  key={execution.id}
                  style={{ margin: "0 0 12px 0", padding: 12, background: "#f8fafc", fontSize: 13 }}
                >
                  <strong>{execution.status}</strong> ·{" "}
                  {execution.matchedKeyword ?? "qualquer comentário"} ·{" "}
                  {new Date(execution.createdAt).toLocaleString()}
                  <div>
                    {execution.actionExecutions
                      .map((action) => `${action.type}: ${action.status}`)
                      .join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </section>
    </main>
  );
}

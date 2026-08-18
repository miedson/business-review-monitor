"use client";

import { useEffect, useState } from "react";
import { getStoredSession } from "../../../lib/auth-session";
import {
  buildGoogleConnectUrl,
  disconnectGoogle,
  buildInstagramConnectUrl,
  disconnectInstagram
} from "../../../lib/api-client";

export default function IntegrationsPage() {
  const [session, setSession] = useState<ReturnType<typeof getStoredSession>>(null);

  useEffect(() => {
    setSession(getStoredSession());
  }, []);

  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleAccountName, setGoogleAccountName] = useState<string | null>(null);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [instagramUsername, setInstagramUsername] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [instagramLoading, setInstagramLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleStatus = params.get("google");
    const instagramStatus = params.get("instagram");

    if (googleStatus === "connected") {
      setMessage({ type: "success", text: "Google Business Profile conectado com sucesso!" });
      window.history.replaceState({}, "", "/settings/integrations");
    } else if (googleStatus === "error") {
      setMessage({ type: "error", text: "Erro ao conectar Google Business Profile. Tente novamente." });
      window.history.replaceState({}, "", "/settings/integrations");
    }

    if (instagramStatus === "connected") {
      setMessage({ type: "success", text: "Instagram conectado com sucesso!" });
      window.history.replaceState({}, "", "/settings/integrations");
    } else if (instagramStatus === "error") {
      setMessage({ type: "error", text: "Erro ao conectar Instagram. Tente novamente." });
      window.history.replaceState({}, "", "/settings/integrations");
    }
  }, []);

  useEffect(() => {
    if (session?.accessToken) {
      checkConnections();
    }
  }, [session]);

  const checkConnections = async () => {
    if (!session?.accessToken) return;

    try {
      setGoogleLoading(true);
      const googleResult = await listGoogleAccounts(session.accessToken);
      const firstGoogleAccount = googleResult.accounts[0];
      if (firstGoogleAccount) {
        setGoogleConnected(true);
        setGoogleAccountName(firstGoogleAccount.accountName ?? firstGoogleAccount.name);
      }
    } catch {
      setGoogleConnected(false);
    } finally {
      setGoogleLoading(false);
    }

    try {
      setInstagramLoading(true);
      const instagramResult = await listInstagramAccounts(session.accessToken);
      const firstInstagramAccount = instagramResult.accounts[0];
      if (firstInstagramAccount) {
        setInstagramConnected(true);
        setInstagramUsername(firstInstagramAccount.username);
      }
    } catch {
      setInstagramConnected(false);
    } finally {
      setInstagramLoading(false);
    }
  };

  const handleGoogleConnect = async () => {
    if (!session?.accessToken) return;

    try {
      setGoogleLoading(true);
      const url = await buildGoogleConnectUrl(session.accessToken);
      window.location.href = url;
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao iniciar conexao com Google"
      });
      setGoogleLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    if (!session?.accessToken) return;

    try {
      setGoogleLoading(true);
      await disconnectGoogle({ accessToken: session.accessToken });
      setGoogleConnected(false);
      setGoogleAccountName(null);
      setMessage({ type: "success", text: "Google Business Profile desconectado com sucesso!" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao desconectar Google"
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleInstagramConnect = async () => {
    if (!session?.accessToken) return;

    try {
      setInstagramLoading(true);
      const url = await buildInstagramConnectUrl(session.accessToken);
      window.location.href = url;
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao iniciar conexao com Instagram"
      });
      setInstagramLoading(false);
    }
  };

  const handleInstagramDisconnect = async () => {
    if (!session?.accessToken) return;

    try {
      setInstagramLoading(true);
      await disconnectInstagram({ accessToken: session.accessToken });
      setInstagramConnected(false);
      setInstagramUsername(null);
      setMessage({ type: "success", text: "Instagram desconectado com sucesso!" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao desconectar Instagram"
      });
    } finally {
      setInstagramLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Integracoes</h1>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.325,0-6.033-2.707-6.033-6.032s2.708-6.032,6.033-6.032c1.498,0,2.866,0.539,3.921,1.453l2.814-2.814C17.578,0.486,15.137,0,12.545,0C7.034,0,2.56,4.475,2.56,10.006c0,5.531,4.474,10.006,10.005,10.006c7.046,0,12.158-5.199,11.881-11.758L12.545,10.239z" />
            </svg>
            Google Business Profile
          </h2>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className={googleConnected ? "text-green-600 font-medium" : "text-gray-600"}>
                Status: {googleConnected ? "Conectado" : "Nao conectado"}
              </p>
              {googleAccountName && (
                <p className="text-sm text-gray-500 mt-1">Conta: {googleAccountName}</p>
              )}
            </div>

            <div className="flex gap-2">
              {googleConnected ? (
                <button
                  onClick={handleGoogleDisconnect}
                  disabled={googleLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {googleLoading ? "Desconectando..." : "Desconectar"}
                </button>
              ) : (
                <button
                  onClick={handleGoogleConnect}
                  disabled={googleLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {googleLoading ? "Conectando..." : "Conectar Google Business Profile"}
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            Instagram
          </h2>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className={instagramConnected ? "text-green-600 font-medium" : "text-gray-600"}>
                Status: {instagramConnected ? "Conectado" : "Nao conectado"}
              </p>
              {instagramUsername && (
                <p className="text-sm text-gray-500 mt-1">@{instagramUsername}</p>
              )}
            </div>

            <div className="flex gap-2">
              {instagramConnected ? (
                <button
                  onClick={handleInstagramDisconnect}
                  disabled={instagramLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {instagramLoading ? "Desconectando..." : "Desconectar"}
                </button>
              ) : (
                <button
                  onClick={handleInstagramConnect}
                  disabled={instagramLoading}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {instagramLoading ? "Conectando..." : "Conectar Instagram"}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

async function listGoogleAccounts(accessToken: string): Promise<{ accounts: { id: string; name: string; accountName?: string }[] }> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/integrations/google/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error("Failed to list Google accounts");
  return response.json();
}

async function listInstagramAccounts(accessToken: string): Promise<{ accounts: { id: string; username: string }[] }> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/integrations/instagram/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error("Failed to list Instagram accounts");
  return response.json();
}
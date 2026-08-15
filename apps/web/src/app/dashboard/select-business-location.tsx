"use client";

import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Grid,
  Heading,
  RadioGroup,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import {
  buildGoogleConnectUrl,
  disconnectGoogle,
  type GoogleAccount,
  type GoogleLocation,
  type GoogleReview,
  type GoogleReviewsResponse,
  listGoogleAccounts,
  listGoogleLocations,
  listGoogleReviews,
  requestGoogleReviewSync,
  selectBusinessLocation,
} from "../../lib/api-client";
import { clearStoredSession, getStoredSession } from "../../lib/auth-session";

export function BusinessLocationSelection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<ReturnType<typeof getStoredSession>>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [connectErrorMessage, setConnectErrorMessage] = useState<string | null>(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    setSession(getStoredSession());
  }, []);

  const googleStatus = searchParams.get("google");

  const accountsQuery = useQuery({
    enabled: Boolean(session?.accessToken),
    queryFn: () => listGoogleAccounts(session?.accessToken ?? ""),
    queryKey: ["google-accounts", session?.accessToken],
    retry: false,
  });

  const accounts = accountsQuery.data?.accounts ?? [];

  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0]?.id ?? "");
    }
  }, [accounts, selectedAccountId]);

  const locationsQuery = useQuery({
    enabled: Boolean(session?.accessToken && selectedAccountId),
    queryFn: () =>
      listGoogleLocations({
        accessToken: session?.accessToken ?? "",
        accountId: selectedAccountId,
      }),
    queryKey: ["google-locations", session?.accessToken, selectedAccountId],
    retry: false,
  });

  const locations = locationsQuery.data?.locations ?? [];

  useEffect(() => {
    if (!selectedLocationId && locations.length > 0) {
      setSelectedLocationId(locations[0]?.id ?? "");
    }
  }, [locations, selectedLocationId]);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId),
    [locations, selectedLocationId]
  );

  const reviewsQuery = useQuery({
    enabled: Boolean(session?.accessToken && selectedAccountId && selectedLocationId),
    queryFn: () =>
      listGoogleReviews({
        accessToken: session?.accessToken ?? "",
        accountId: selectedAccountId,
        locationId: selectedLocationId,
      }),
    queryKey: [
      "google-reviews",
      session?.accessToken,
      selectedAccountId,
      selectedLocationId,
    ],
    retry: false,
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      requestGoogleReviewSync({
        accessToken: session?.accessToken ?? "",
        accountId: selectedAccountId,
        locationId: selectedLocationId,
      }),
    onSuccess: (result) => {
      setSyncNotice(`Sincronizacao solicitada. Job ${result.jobId}.`);
      void reviewsQuery.refetch();
    },
  });

  const selectLocationMutation = useMutation({
    mutationFn: (businessLocationId: string) =>
      selectBusinessLocation({
        accessToken: session?.accessToken ?? "",
        businessLocationId
      }),
    onSuccess: async () => {
      await locationsQuery.refetch();
      await reviewsQuery.refetch();
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: () => disconnectGoogle({ accessToken: session?.accessToken ?? "" }),
    onSuccess: async () => {
      setSelectedAccountId("");
      setSelectedLocationId("");
      setSyncNotice(null);
      await accountsQuery.refetch();
    }
  });

  async function handleConnectGoogle() {
    if (!session?.accessToken) {
      router.replace("/login");
      return;
    }

    setConnectErrorMessage(null);
    setIsConnectingGoogle(true);

    try {
      window.location.href = await buildGoogleConnectUrl(session.accessToken);
    } catch (error) {
      setConnectErrorMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel iniciar a conexao com o Google."
      );
      setIsConnectingGoogle(false);
    }
  }

  function handleLogout() {
    clearStoredSession();
    router.replace("/login");
  }

  if (!session) {
    return <SignedOutView />;
  }

  const connectionError =
    accountsQuery.isError || locationsQuery.isError || reviewsQuery.isError;
  const hasGoogleConnection = accounts.length > 0;
  const hasSelectedLocation = Boolean(selectedLocation);

  return (
    <Box bg="#f3f6f8" minH="100vh">
      <AppHeader email={session.user.email} name={session.user.name} onLogout={handleLogout} />

      <Container maxW="1180px" px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
        <Stack gap={6}>
          <IntroPanel
            hasGoogleConnection={hasGoogleConnection}
            hasSelectedLocation={hasSelectedLocation}
            isConnectingGoogle={isConnectingGoogle}
            onConnectGoogle={handleConnectGoogle}
          />

          {googleStatus === "success" ? (
            <Notice tone="success">Conta Google conectada. Escolha a empresa para monitorar.</Notice>
          ) : null}

          {googleStatus === "error" ? (
            <Notice tone="warning">
              Nao foi possivel concluir a conexao com o Google. Tente novamente.
            </Notice>
          ) : null}

          {connectionError ? (
            <Notice tone="warning">
              {readQueryError(accountsQuery.error) ??
                readQueryError(locationsQuery.error) ??
                readQueryError(reviewsQuery.error) ??
                "Nao foi possivel carregar os dados do Google."}
            </Notice>
          ) : null}

          {!hasGoogleConnection && !accountsQuery.isLoading ? (
            <ConnectGooglePanel
              errorMessage={connectErrorMessage}
              isConnectingGoogle={isConnectingGoogle}
              onConnectGoogle={handleConnectGoogle}
            />
          ) : null}

          {accountsQuery.isLoading ? (
            <StatusPanel message="Buscando contas Google Business Profile..." />
          ) : null}

          {hasGoogleConnection ? (
            <Grid gap={5} templateColumns={{ base: "1fr", lg: "360px 1fr" }}>
              <Stack gap={5}>
                <AccountsPanel
                  accounts={accounts}
                  selectedAccountId={selectedAccountId}
                  onSelectAccount={(accountId) => {
                    setSelectedAccountId(accountId);
                    setSelectedLocationId("");
                    setSyncNotice(null);
                  }}
                />

                <LocationsPanel
                  isLoading={locationsQuery.isLoading}
                  locations={locations}
                  selectedLocationId={selectedLocationId}
                  onSelectLocation={(locationId) => {
                    setSelectedLocationId(locationId);
                    setSyncNotice(null);
                    selectLocationMutation.mutate(locationId);
                  }}
                />
              </Stack>

              <DashboardPanel
                isLoading={reviewsQuery.isLoading}
                location={selectedLocation}
                onDisconnect={() => disconnectMutation.mutate()}
                onSyncNow={() => syncMutation.mutate()}
                reviewsResult={reviewsQuery.data}
                selectError={selectLocationMutation.error}
                selectPending={selectLocationMutation.isPending}
                disconnectError={disconnectMutation.error}
                disconnectPending={disconnectMutation.isPending}
                syncError={syncMutation.error}
                syncNotice={syncNotice}
                syncPending={syncMutation.isPending}
              />
            </Grid>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}

function SignedOutView() {
  return (
    <Box bg="#f3f6f8" minH="100vh">
      <Container maxW="900px" py={{ base: 10, md: 20 }}>
        <Box bg="white" border="1px solid #dbe3e7" borderRadius="8px" p={{ base: 6, md: 8 }}>
          <Heading color="#173033" size="lg">
            Entre para configurar sua empresa
          </Heading>
          <Text color="#607076" mt={3}>
            O painel precisa de uma conta do Business Review Monitor antes de conectar o
            Google Business Profile.
          </Text>
          <Flex gap={3} mt={6} wrap="wrap">
            <Button asChild bg="#193b3f" color="white" _hover={{ bg: "#102b2f" }}>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/register">Criar conta</Link>
            </Button>
          </Flex>
        </Box>
      </Container>
    </Box>
  );
}

function AppHeader(props: {
  email: string;
  name: string;
  onLogout: () => void;
}) {
  return (
    <Box bg="white" borderBottom="1px solid #dbe3e7">
      <Container maxW="1180px" px={{ base: 4, md: 6 }} py={4}>
        <Flex align="center" gap={4} justify="space-between">
          <Box>
            <Text color="#193b3f" fontSize="sm" fontWeight="800" letterSpacing="0">
              Business Review Monitor
            </Text>
            <Text color="#607076" fontSize="sm">
              {props.name} - {props.email}
            </Text>
          </Box>
          <Button onClick={props.onLogout} size="sm" variant="outline">
            Sair
          </Button>
        </Flex>
      </Container>
    </Box>
  );
}

function IntroPanel(props: {
  hasGoogleConnection: boolean;
  hasSelectedLocation: boolean;
  isConnectingGoogle: boolean;
  onConnectGoogle: () => void;
}) {
  return (
    <Box bg="#173033" borderRadius="8px" color="white" p={{ base: 5, md: 7 }}>
      <Grid gap={6} templateColumns={{ base: "1fr", lg: "1.3fr 1fr" }}>
        <Box>
          <Badge bg="#d9f99d" color="#173033" mb={4}>
            MVP Google Business Profile
          </Badge>
          <Heading fontSize={{ base: "2xl", md: "4xl" }} lineHeight="1.08">
            Suas avaliacoes do Google em um painel mais simples.
          </Heading>
          <Text color="#d7e2e4" fontSize={{ base: "md", md: "lg" }} mt={4} maxW="640px">
            Conecte sua conta, escolha a empresa correta e acompanhe os comentarios
            recentes sem navegar pela interface completa do Google.
          </Text>
          {!props.hasGoogleConnection ? (
            <Button
              bg="#f7c948"
              color="#173033"
              loading={props.isConnectingGoogle}
              mt={6}
              onClick={props.onConnectGoogle}
              _hover={{ bg: "#f0b429" }}
            >
              Conectar Google
            </Button>
          ) : null}
        </Box>

        <Stack gap={3}>
          <StepItem isDone label="Conta criada" />
          <StepItem isDone={props.hasGoogleConnection} label="Google conectado" />
          <StepItem isDone={props.hasSelectedLocation} label="Empresa selecionada" />
          <StepItem isDone={props.hasSelectedLocation} label="Dashboard liberado" />
        </Stack>
      </Grid>
    </Box>
  );
}

function StepItem(props: { isDone: boolean; label: string }) {
  return (
    <Flex
      align="center"
      bg={props.isDone ? "rgba(217,249,157,0.16)" : "rgba(255,255,255,0.08)"}
      border="1px solid"
      borderColor={props.isDone ? "rgba(217,249,157,0.55)" : "rgba(255,255,255,0.16)"}
      borderRadius="8px"
      gap={3}
      minH="48px"
      px={4}
    >
      <Box
        bg={props.isDone ? "#d9f99d" : "transparent"}
        border="1px solid"
        borderColor={props.isDone ? "#d9f99d" : "rgba(255,255,255,0.45)"}
        borderRadius="999px"
        h="18px"
        w="18px"
      />
      <Text color={props.isDone ? "white" : "#d7e2e4"} fontWeight="700">
        {props.label}
      </Text>
    </Flex>
  );
}

function ConnectGooglePanel(props: {
  errorMessage: string | null;
  isConnectingGoogle: boolean;
  onConnectGoogle: () => void;
}) {
  return (
    <Box bg="white" border="1px solid #dbe3e7" borderRadius="8px" p={{ base: 5, md: 6 }}>
      <Flex align={{ base: "stretch", md: "center" }} gap={5} justify="space-between" wrap="wrap">
        <Box maxW="680px">
          <Heading color="#173033" size="md">
            Conecte o Google Business Profile
          </Heading>
          <Text color="#607076" mt={2}>
            Voce sera levado ao Google para autorizar o acesso business.manage. A senha
            Google nunca passa pelo Business Review Monitor.
          </Text>
        </Box>
        <Button
          bg="#193b3f"
          color="white"
          loading={props.isConnectingGoogle}
          onClick={props.onConnectGoogle}
          _hover={{ bg: "#102b2f" }}
        >
          Conectar Google
        </Button>
      </Flex>
      {props.errorMessage ? (
        <Notice tone="warning">{props.errorMessage}</Notice>
      ) : null}
    </Box>
  );
}

function AccountsPanel(props: {
  accounts: GoogleAccount[];
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
}) {
  return (
    <Box bg="white" border="1px solid #dbe3e7" borderRadius="8px" p={5}>
      <Heading color="#173033" size="sm">
        Conta Google
      </Heading>
      <Text color="#607076" fontSize="sm" mt={1}>
        Selecione a conta que administra suas empresas.
      </Text>
      <RadioGroup.Root
        mt={4}
        onValueChange={(details) => {
          if (details.value) {
            props.onSelectAccount(details.value);
          }
        }}
        value={props.selectedAccountId}
      >
        <Stack gap={3}>
          {props.accounts.map((account) => (
            <RadioGroup.Item key={account.id} value={account.id}>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemIndicator />
              <RadioGroup.ItemText>
                <Text color="#25343b" fontWeight="700">
                  {account.accountName ?? account.name}
                </Text>
              </RadioGroup.ItemText>
            </RadioGroup.Item>
          ))}
        </Stack>
      </RadioGroup.Root>
    </Box>
  );
}

function LocationsPanel(props: {
  isLoading: boolean;
  locations: GoogleLocation[];
  selectedLocationId: string;
  onSelectLocation: (locationId: string) => void;
}) {
  if (props.isLoading) {
    return <StatusPanel message="Buscando empresas disponiveis..." />;
  }

  if (props.locations.length === 0) {
    return <StatusPanel message="Nenhuma empresa encontrada para esta conta." />;
  }

  return (
    <Box bg="white" border="1px solid #dbe3e7" borderRadius="8px" p={5}>
      <Heading color="#173033" size="sm">
        Empresas encontradas
      </Heading>
      <Text color="#607076" fontSize="sm" mt={1}>
        Escolha uma empresa para exibir no dashboard.
      </Text>
      <RadioGroup.Root
        mt={4}
        onValueChange={(details) => {
          if (details.value) {
            props.onSelectLocation(details.value);
          }
        }}
        value={props.selectedLocationId}
      >
        <Stack gap={3}>
          {props.locations.map((location) => (
            <RadioGroup.Item key={location.id} value={location.id}>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemIndicator />
              <RadioGroup.ItemText>
                <Flex align="center" gap={2} wrap="wrap">
                  <Text color="#25343b" fontWeight="700">
                    {location.name}
                  </Text>
                  {location.storeCode ? (
                    <Badge colorPalette="gray">{location.storeCode}</Badge>
                  ) : null}
                  {location.isVerified === false ? (
                    <Badge colorPalette="orange">Nao verificada</Badge>
                  ) : null}
                </Flex>
              </RadioGroup.ItemText>
            </RadioGroup.Item>
          ))}
        </Stack>
      </RadioGroup.Root>
    </Box>
  );
}

function DashboardPanel(props: {
  isLoading: boolean;
  location: GoogleLocation | undefined;
  onDisconnect: () => void;
  onSyncNow: () => void;
  reviewsResult: GoogleReviewsResponse | undefined;
  selectError: Error | null;
  selectPending: boolean;
  disconnectError: Error | null;
  disconnectPending: boolean;
  syncError: Error | null;
  syncNotice: string | null;
  syncPending: boolean;
}) {
  if (!props.location) {
    return <StatusPanel message="Selecione uma empresa para ver as avaliacoes." />;
  }

  const reviews = props.reviewsResult?.reviews ?? [];
  const totalReviewCount = props.reviewsResult?.totalReviewCount ?? reviews.length;
  const averageRating = props.reviewsResult?.averageRating ?? calculateAverageRating(reviews);

  return (
    <Stack gap={5}>
      <Box bg="white" border="1px solid #dbe3e7" borderRadius="8px" p={{ base: 5, md: 6 }}>
        <Flex align={{ base: "stretch", md: "start" }} gap={4} justify="space-between" wrap="wrap">
          <Box>
            <Badge bg="#e0f2fe" color="#075985" mb={3}>
              Empresa monitorada
            </Badge>
            <Heading color="#173033" size="lg">
              {props.location.name}
            </Heading>
            <Text color="#607076" mt={2}>
              Ultima sincronizacao:{" "}
              {props.location.lastSyncedAt
                ? formatDateTime(new Date(props.location.lastSyncedAt))
                : "dados atuais consultados do Google"}
            </Text>
          </Box>
          <Button
            bg="#193b3f"
            color="white"
            loading={props.syncPending || props.selectPending}
            onClick={props.onSyncNow}
            _hover={{ bg: "#102b2f" }}
          >
            Sincronizar agora
          </Button>
        </Flex>

        {props.syncNotice ? (
          <Notice tone="success">{props.syncNotice}</Notice>
        ) : null}

        {props.syncError ? (
          <Notice tone="warning">{props.syncError.message}</Notice>
        ) : null}

        {props.selectError ? (
          <Notice tone="warning">{props.selectError.message}</Notice>
        ) : null}

        {props.disconnectError ? (
          <Notice tone="warning">{props.disconnectError.message}</Notice>
        ) : null}

        <Grid gap={4} mt={6} templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}>
          <MetricCard label="Nota atual" value={averageRating ? averageRating.toFixed(1) : "-"} />
          <MetricCard label="Avaliacoes" value={String(totalReviewCount)} />
          <MetricCard label="Status" value={props.isLoading ? "Carregando" : "Ativo"} />
        </Grid>
      </Box>

      <ReviewsPanel isLoading={props.isLoading} reviews={reviews} />

      <Box bg="white" border="1px solid #dbe3e7" borderRadius="8px" p={{ base: 5, md: 6 }}>
        <Flex align="center" gap={4} justify="space-between" wrap="wrap">
          <Box>
            <Heading color="#173033" size="sm">
              Integracao Google
            </Heading>
            <Text color="#607076" fontSize="sm" mt={1}>
              Remova a autorizacao e apague o cache local de avaliacoes quando precisar.
            </Text>
          </Box>
          <Button
            colorPalette="red"
            loading={props.disconnectPending}
            onClick={props.onDisconnect}
            variant="outline"
          >
            Desconectar Google
          </Button>
        </Flex>
      </Box>
    </Stack>
  );
}

function MetricCard(props: { label: string; value: string }) {
  return (
    <Box bg="#f8fafb" border="1px solid #e2e8ec" borderRadius="8px" minH="112px" p={4}>
      <Text color="#607076" fontSize="sm" fontWeight="700">
        {props.label}
      </Text>
      <Text color="#173033" fontSize="3xl" fontWeight="800" mt={2}>
        {props.value}
      </Text>
    </Box>
  );
}

function ReviewsPanel(props: { isLoading: boolean; reviews: GoogleReview[] }) {
  if (props.isLoading) {
    return <StatusPanel message="Carregando avaliacoes recentes..." />;
  }

  if (props.reviews.length === 0) {
    return <StatusPanel message="Ainda nao encontramos avaliacoes para esta empresa." />;
  }

  return (
    <Box bg="white" border="1px solid #dbe3e7" borderRadius="8px" p={{ base: 5, md: 6 }}>
      <Heading color="#173033" size="md">
        Avaliacoes recentes
      </Heading>
      <Stack gap={0} mt={4}>
        {props.reviews.slice(0, 10).map((review) => (
          <Box key={review.id} borderTop="1px solid #edf1f4" py={4}>
            <Flex gap={3} justify="space-between" wrap="wrap">
              <Box>
                <Text color="#173033" fontWeight="800">
                  {starRatingLabel(review.starRating)}
                </Text>
                <Text color="#607076" fontSize="sm">
                  {review.reviewerName ?? "Cliente Google"}
                </Text>
              </Box>
              <Text color="#607076" fontSize="sm">
                {formatDateTime(new Date(review.updatedAt))}
              </Text>
            </Flex>
            {review.comment ? (
              <Text color="#25343b" mt={3}>
                {review.comment}
              </Text>
            ) : null}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

function StatusPanel(props: { message: string }) {
  return (
    <Box bg="white" border="1px solid #dbe3e7" borderRadius="8px" p={5}>
      <Text color="#607076">{props.message}</Text>
    </Box>
  );
}

function Notice(props: { children: ReactNode; tone: "success" | "warning" }) {
  const isSuccess = props.tone === "success";

  return (
    <Box
      bg={isSuccess ? "#ecfdf3" : "#fff7ed"}
      border="1px solid"
      borderColor={isSuccess ? "#86efac" : "#fdba74"}
      borderRadius="8px"
      mt={props.tone === "success" ? 4 : 0}
      p={4}
    >
      <Text color={isSuccess ? "#166534" : "#9a3412"}>{props.children}</Text>
    </Box>
  );
}

function readQueryError(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

function calculateAverageRating(reviews: GoogleReview[]): number | null {
  if (reviews.length === 0) {
    return null;
  }

  const total = reviews.reduce((sum, review) => sum + starRatingValue(review.starRating), 0);
  return total / reviews.length;
}

function starRatingLabel(starRating: GoogleReview["starRating"]): string {
  return `${"★".repeat(starRatingValue(starRating))}${"☆".repeat(
    5 - starRatingValue(starRating)
  )}`;
}

function starRatingValue(starRating: GoogleReview["starRating"]): number {
  const values: Record<GoogleReview["starRating"], number> = {
    FIVE: 5,
    FOUR: 4,
    ONE: 1,
    STAR_RATING_UNSPECIFIED: 0,
    THREE: 3,
    TWO: 2,
  };

  return values[starRating];
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

import { Box, Container, Flex, Heading, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <Box minH="100vh" bg="surface.secondary">
      <Container maxW="1120px" py={{ base: 8, md: 14 }}>
        <Flex
          minH={{ base: "auto", md: "calc(100vh - 112px)" }}
          align="center"
          gap={{ base: 8, md: 14 }}
          direction={{ base: "column", md: "row" }}
        >
          <Box flex="1" w="full">
            <Flex align="center" gap={3} mb={10}>
              <Box
                w="42px"
                h="42px"
                borderRadius="8px"
                bg="brand.600"
                color="white"
                display="grid"
                placeItems="center"
                fontWeight="800"
              >
                BRH
              </Box>
              <Box>
                <Text fontWeight="800" color="text.primary">
                  Business Reputation Hub
                </Text>
                <Text color="text.tertiary" fontSize="sm">
                  Centralize sua reputação digital
                </Text>
              </Box>
            </Flex>

            <Heading
              color="text.primary"
              fontSize={{ base: "3xl", md: "5xl" }}
              lineHeight="1.05"
              maxW="620px"
            >
              Acompanhe as avaliacoes da sua empresa sem navegar pela complexidade do Google
              Business Profile.
            </Heading>
            <Text mt={5} color="text.secondary" fontSize="lg" maxW="560px">
              Um painel objetivo para conectar sua conta Google, escolher a empresa certa e
              visualizar as avaliacoes importantes em poucos passos.
            </Text>

            <Flex mt={8} gap={3} wrap="wrap">
              {["Conexao segura", "Empresas organizadas", "Reviews em cache"].map((item) => (
                <Box
                  key={item}
                  px={3}
                  py={2}
                  border="1px solid"
                  borderColor="surface.border"
                  borderRadius="8px"
                  color="text.primary"
                  bg="surface.primary"
                  fontWeight="600"
                  fontSize="sm"
                >
                  {item}
                </Box>
              ))}
            </Flex>
          </Box>

          <Box
            w="full"
            maxW="430px"
            bg="surface.primary"
            border="1px solid"
            borderColor="surface.border"
            borderRadius="2xl"
            p={{ base: 5, md: 7 }}
            boxShadow="xl"
          >
            <Heading size="lg" color="text.primary">
              {title}
            </Heading>
            <Text mt={2} mb={6} color="text.tertiary">
              {subtitle}
            </Text>
            {children}
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}

import type { ReactNode } from "react";
import { Box, Container, Flex, Heading, Text } from "@chakra-ui/react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <Box minH="100vh" bg="#f3f6f8">
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
                bg="#193b3f"
                color="white"
                display="grid"
                placeItems="center"
                fontWeight="800"
              >
                BR
              </Box>
              <Box>
                <Text fontWeight="800" color="#173033">
                  Business Review Monitor
                </Text>
                <Text color="#607076" fontSize="sm">
                  Google reviews em uma rotina simples
                </Text>
              </Box>
            </Flex>

            <Heading
              color="#173033"
              fontSize={{ base: "3xl", md: "5xl" }}
              lineHeight="1.05"
              maxW="620px"
            >
              Acompanhe as avaliacoes da sua empresa sem navegar pela
              complexidade do Google Business Profile.
            </Heading>
            <Text mt={5} color="#53666d" fontSize="lg" maxW="560px">
              Um painel objetivo para conectar sua conta Google, escolher a
              empresa certa e visualizar as avaliacoes importantes em poucos
              passos.
            </Text>

            <Flex mt={8} gap={3} wrap="wrap">
              {["Conexao segura", "Empresas organizadas", "Reviews em cache"].map(
                (item) => (
                  <Box
                    key={item}
                    px={3}
                    py={2}
                    border="1px solid #d8e1e4"
                    borderRadius="8px"
                    color="#315056"
                    bg="white"
                    fontWeight="600"
                    fontSize="sm"
                  >
                    {item}
                  </Box>
                )
              )}
            </Flex>
          </Box>

          <Box
            w="full"
            maxW="430px"
            bg="white"
            border="1px solid #dbe4e7"
            borderRadius="8px"
            p={{ base: 5, md: 7 }}
            boxShadow="0 24px 70px rgba(28, 55, 61, 0.12)"
          >
            <Heading size="lg" color="#173033">
              {title}
            </Heading>
            <Text mt={2} mb={6} color="#607076">
              {subtitle}
            </Text>
            {children}
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}

import { describe, expect, it } from "vitest";

import {
  matchesInstagramComment,
  normalizeComment,
  renderInstagramTemplate,
} from "./instagram-automation.js";

describe("Instagram comment automation matcher", () => {
  it("normalizes spaces, case, and accents consistently", () => {
    expect(normalizeComment("  EU   QUERO  ")).toBe("eu quero");
    expect(
      matchesInstagramComment({ text: "AÇÃO", matchType: "EXACT_MATCH", keywords: ["acao"] })
        .matched,
    ).toBe(true);
  });
  it("matches contains and exact modes", () => {
    expect(
      matchesInstagramComment({
        text: "Oi, eu quero o link!",
        matchType: "CONTAINS",
        keywords: ["eu quero"],
      }).matched,
    ).toBe(true);
    expect(
      matchesInstagramComment({
        text: "Eu quero!",
        matchType: "EXACT_MATCH",
        keywords: ["eu quero"],
      }).matched,
    ).toBe(false);
  });
  it("matches full words and exclusions first", () => {
    expect(
      matchesInstagramComment({ text: "manda o link", matchType: "FULL_WORD", keywords: ["link"] })
        .matched,
    ).toBe(true);
    expect(
      matchesInstagramComment({ text: "hyperlink", matchType: "FULL_WORD", keywords: ["link"] })
        .matched,
    ).toBe(false);
    expect(
      matchesInstagramComment({
        text: "não quero",
        matchType: "CONTAINS",
        keywords: ["quero"],
        excludedKeywords: ["nao quero"],
      }).matched,
    ).toBe(false);
  });
  it("renders missing variables as empty strings", () => {
    expect(renderInstagramTemplate("Oi {{ first_name }} {{unknown}}", { first_name: "Ana" })).toBe(
      "Oi Ana ",
    );
  });
});

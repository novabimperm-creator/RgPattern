import type { MedicalCase } from "./types";

export type TextField = "diagnosis" | "description" | "comments";

function normalize(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е");
}

export function searchTokens(query: string): string[] {
  return normalize(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function caseTextFields(item: MedicalCase): Record<TextField, string> {
  return {
    diagnosis: item.diagnosis ?? "",
    description: item.description ?? "",
    comments: item.comments ?? "",
  };
}

export function matchingTextFields(item: MedicalCase, query: string): TextField[] {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return [];
  const fields = caseTextFields(item);
  return (Object.keys(fields) as TextField[]).filter((key) => {
    const haystack = normalize(fields[key]);
    return tokens.some((token) => haystack.includes(token));
  });
}

export function caseMatchesQuery(item: MedicalCase, query: string): boolean {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return true;
  const haystack = normalize(
    [item.diagnosis, item.description, item.comments].join("\n"),
  );
  return tokens.every((token) => haystack.includes(token));
}

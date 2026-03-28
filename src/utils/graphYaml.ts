import { parse, stringify } from "yaml";

import type { PortableGraphDocument } from "./graphDocument";

export interface SerializeGraphYamlRequest {
  readonly document: PortableGraphDocument;
}

export interface SerializeGraphYamlResult {
  readonly content: string;
  readonly suggestedFileName: string;
}

export interface ParseGraphYamlRequest {
  readonly content: string;
}

/**
 * Serializes a portable graph document into deterministic YAML text.
 */
export function serializeGraphYaml(request: SerializeGraphYamlRequest): SerializeGraphYamlResult {
  return {
    content: stringify(request.document, { indent: 2, lineWidth: 0 }),
    suggestedFileName: createGraphDocumentFileName(request.document.contract.name),
  };
}

/**
 * Parses YAML text into an unknown value for higher-level validation.
 */
export function parseGraphYaml(request: ParseGraphYamlRequest): unknown {
  return parse(request.content);
}

/**
 * Triggers a YAML file download in the current browser document.
 */
export function downloadGraphYamlFile(result: SerializeGraphYamlResult): void {
  if (typeof document === "undefined") {
    throw new Error("Graph downloads are only available in the browser.");
  }

  const blob = new Blob([result.content], { type: "application/x.frontier-flow+yaml;charset=utf-8" });
  const objectUrl = typeof URL.createObjectURL === "function"
    ? URL.createObjectURL(blob)
    : `data:text/yaml;charset=utf-8,${encodeURIComponent(result.content)}`;
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = result.suggestedFileName;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  if (objectUrl.startsWith("blob:") && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(objectUrl);
  }
}

function createGraphDocumentFileName(contractName: string): string {
  const slug = contractName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug.length > 0 ? slug : "untitled-contract"}.frontier-flow.yaml`;
}
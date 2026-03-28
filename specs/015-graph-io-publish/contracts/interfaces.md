# 1. Interface Contracts: Graph Import, Export, and Publish

**Feature**: 015-graph-io-publish  
**Date**: 2026-03-28

## 1.1. Portable Graph Document Codec

Responsible for converting between local saved contracts and the versioned portable document.

### 1.1.1. Export Input

```typescript
interface CreatePortableGraphDocumentRequest {
  readonly contract: NamedFlowContract;
  readonly appVersion: string;
  readonly source: {
    readonly channel: "yaml-export" | "walrus-publish";
  };
}
```

### 1.1.2. Export Output

```typescript
interface PortableGraphDocument {
  readonly version: 1;
  readonly kind: "frontier-flow-graph";
  readonly exportedAt: string;
  readonly appVersion: string;
  readonly contract: {
    readonly name: string;
    readonly description?: string;
    readonly updatedAt: string;
    readonly source: {
      readonly channel: "yaml-export" | "walrus-publish" | "walrus-import";
    };
  };
  readonly graph: {
    readonly nodes: FlowNode[];
    readonly edges: FlowEdge[];
    readonly summary: {
      readonly nodeCount: number;
      readonly edgeCount: number;
    };
  };
}
```

### 1.1.3. Parse Input

```typescript
interface ParsePortableGraphDocumentRequest {
  readonly rawContent: string;
  readonly sourceLabel: string;
}
```

### 1.1.4. Parse Output

```typescript
interface ParsePortableGraphDocumentResult {
  readonly document: PortableGraphDocument;
  readonly importedContract: NamedFlowContract;
}
```

### 1.1.5. Error Cases

- `PortableGraphParseError` — invalid YAML, unsupported version, or missing required fields
- `PortableGraphValidationError` — graph consistency failure such as dangling edges

---

## 1.2. YAML Serialization Layer

Responsible for string encoding and decoding only.

### 1.2.1. Input / Output

```typescript
interface SerializeGraphYamlRequest {
  readonly document: PortableGraphDocument;
}

interface SerializeGraphYamlResult {
  readonly content: string;
  readonly suggestedFileName: string;
}

interface ParseGraphYamlRequest {
  readonly content: string;
}
```

### 1.2.2. Requirements

- Output must be deterministic for the same document input.
- Output must be UTF-8 safe and browser-downloadable.

---

## 1.3. Walrus Graph Client

Responsible for publishing and reading graph documents from Walrus.

### 1.3.1. Configuration Input

```typescript
interface CreateWalrusGraphClientOptions {
  readonly network: "testnet";
  readonly suiRpcUrl: string;
  readonly wasmUrl: string;
  readonly uploadRelayHost?: string;
  readonly fetchTimeoutMs?: number;
}
```

### 1.3.2. Publish Input

```typescript
interface PublishGraphToWalrusRequest {
  readonly yamlContent: string;
  readonly signer: WalrusSigner;
  readonly deletable: boolean;
  readonly epochs: number;
  readonly onStep?: (step: WalrusPublishProgressStep) => void;
  readonly signal?: AbortSignal;
}

type WalrusPublishProgressStep =
  | { readonly phase: "preparing" }
  | { readonly phase: "writing"; readonly detail?: string }
  | { readonly phase: "confirming"; readonly detail?: string }
  | { readonly phase: "complete" };
```

### 1.3.3. Publish Output

```typescript
interface PublishGraphToWalrusResult {
  readonly blobId: string;
  readonly blobObjectId?: string;
  readonly publishedAt: string;
  readonly network: "testnet";
  readonly contentType: "application/x.frontier-flow+yaml";
}
```

### 1.3.4. Read Input / Output

```typescript
interface ReadGraphFromWalrusRequest {
  readonly blobId: string;
  readonly signal?: AbortSignal;
}

interface ReadGraphFromWalrusResult {
  readonly blobId: string;
  readonly yamlContent: string;
}
```

### 1.3.5. Error Cases

- `WalrusReferenceError` — malformed or unsupported reference
- `WalrusReadError` — blob lookup or retrieval failed
- `WalrusPublishError` — upload, signing, or finalization failed

---

## 1.4. Contract Library Merge Contract

Responsible for integrating imported graphs with the local saved-contract library.

### 1.4.1. Input

```typescript
interface MergeImportedContractRequest {
  readonly library: ContractLibrary;
  readonly importedContract: NamedFlowContract;
  readonly makeUniqueName: (
    baseName: string,
    existingNames: readonly string[],
  ) => string;
  readonly activateImportedContract?: boolean;
}
```

### 1.4.2. Output

```typescript
interface MergeImportedContractResult {
  readonly library: ContractLibrary;
  readonly importedContractName: string;
}
```

### 1.4.3. Requirements

- Existing contracts must not be overwritten implicitly.
- Seeded examples must remain intact.
- Name collisions must resolve deterministically.

---

## 1.5. UI Transfer Orchestration Contract

The dialog and hook coordinate the feature without embedding Walrus or YAML concerns into CanvasWorkspace.

```typescript
interface GraphTransferController {
  readonly state: GraphTransferState;
  readonly startExport: () => Promise<void>;
  readonly startImportFromFile: (file: File) => Promise<void>;
  readonly startImportFromWalrus: (blobId: string) => Promise<void>;
  readonly startPublishToWalrus: () => Promise<void>;
  readonly dismiss: () => void;
  readonly reset: () => void;
}
```

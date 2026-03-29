import { useCallback, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Transaction } from "@mysten/sui/transactions";

import {
  createPortableGraphDocument,
  parsePortableGraphDocument,
  type PortableGraphSource,
} from "../utils/graphDocument";
import { downloadGraphYamlFile, serializeGraphYaml } from "../utils/graphYaml";
import { createWalrusGraphClient, isWalrusUploadedStep, type WalrusGraphClient } from "../utils/walrusGraphClient";
import { getWalrusGraphConfig } from "../utils/walrusGraphConfig";
import type { FlowEdge, FlowNode } from "../types/nodes";
import type { NamedFlowContract, PublishedGraphProvenance } from "../utils/contractStorage";

export type GraphTransferMode = "import-file" | "import-walrus" | "export" | "publish";

export interface GraphTransferResult {
  readonly importedName?: string;
  readonly originalImportedName?: string;
  readonly downloadName?: string;
  readonly walrusReference?: PublishedGraphProvenance;
}

export interface GraphTransferState {
  readonly isOpen: boolean;
  readonly status: "idle" | "collecting-input" | "validating" | "publishing" | "importing" | "success" | "error";
  readonly mode: GraphTransferMode | null;
  readonly message: string | null;
  readonly result: GraphTransferResult | null;
}

export interface GraphTransferWalletBridge {
  readonly accountAddress: string | null;
  readonly walletConnected: boolean;
  readonly signAndExecuteTransaction: (transaction: Transaction) => Promise<{ readonly digest: string }>;
}

interface UseGraphTransferOptions {
  readonly activeContract: NamedFlowContract;
  readonly draftContractName: string;
  readonly edges: readonly FlowEdge[];
  readonly nodes: readonly FlowNode[];
  readonly onImportComplete: (contract: NamedFlowContract) => {
    readonly importedName: string;
    readonly originalImportedName?: string;
  };
  readonly onPublishComplete: (provenance: PublishedGraphProvenance) => void;
  readonly walletBridge?: GraphTransferWalletBridge;
  readonly createClient?: () => WalrusGraphClient;
  readonly downloadFile?: typeof downloadGraphYamlFile;
}

const DEFAULT_APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0";

type SetTransferState = Dispatch<SetStateAction<GraphTransferState>>;

interface TransferImportDeps {
  readonly setState: SetTransferState;
  readonly onImportComplete: UseGraphTransferOptions["onImportComplete"];
}

function executeExport(
  setState: SetTransferState,
  createDocument: (source: PortableGraphSource) => ReturnType<typeof createPortableGraphDocument>,
  downloadFileFn: typeof downloadGraphYamlFile,
): void {
  setState({ isOpen: true, status: "validating", mode: "export", message: "Preparing YAML export.", result: null });
  try {
    const result = serializeGraphYaml({ document: createDocument({ channel: "yaml-export" }) });
    downloadFileFn(result);
    setState({
      isOpen: true,
      status: "success",
      mode: "export",
      message: `Downloaded ${result.suggestedFileName}.`,
      result: { downloadName: result.suggestedFileName },
    });
  } catch (error) {
    setState({
      isOpen: true,
      status: "error",
      mode: "export",
      message: error instanceof Error ? error.message : "Could not export this graph to YAML.",
      result: null,
    });
  }
}

async function executeImportFromFile(file: File, deps: TransferImportDeps): Promise<void> {
  deps.setState({ isOpen: true, status: "validating", mode: "import-file", message: `Validating ${file.name}.`, result: null });
  try {
    const parsed = parsePortableGraphDocument({ rawContent: await file.text(), sourceLabel: file.name });
    deps.setState({ isOpen: true, status: "importing", mode: "import-file", message: `Importing ${file.name}.`, result: null });
    const result = deps.onImportComplete(parsed.importedContract);
    const renamedDuringImport = result.originalImportedName !== undefined && result.originalImportedName !== result.importedName;
    deps.setState({
      isOpen: true,
      status: "success",
      mode: "import-file",
      message: renamedDuringImport
        ? `Imported ${result.originalImportedName} as ${result.importedName} to avoid overwriting an existing contract.`
        : `Imported ${result.importedName}.`,
      result: { importedName: result.importedName, originalImportedName: result.originalImportedName },
    });
  } catch (error) {
    deps.setState({
      isOpen: true,
      status: "error",
      mode: "import-file",
      message: error instanceof Error ? error.message : `Could not import ${file.name}.`,
      result: null,
    });
  }
}

async function executeImportFromWalrus(
  blobId: string,
  client: WalrusGraphClient,
  abortControllerRef: { current: AbortController | null },
  deps: TransferImportDeps,
): Promise<void> {
  const normalizedBlobId = blobId.trim();
  if (normalizedBlobId.length === 0) {
    deps.setState({ isOpen: true, status: "error", mode: "import-walrus", message: "Enter a Walrus blob id to import a graph.", result: null });
    return;
  }

  abortControllerRef.current?.abort();
  const controller = new AbortController();
  abortControllerRef.current = controller;

  deps.setState({ isOpen: true, status: "validating", mode: "import-walrus", message: `Loading ${normalizedBlobId} from Walrus.`, result: null });
  try {
    const yamlContent = await client.readGraphYaml(normalizedBlobId, controller.signal);
    const provenance: PublishedGraphProvenance = {
      blobId: normalizedBlobId,
      network: getWalrusGraphConfig().network,
      publishedAt: new Date().toISOString(),
      contentType: "application/x.frontier-flow+yaml",
    };
    const parsed = parsePortableGraphDocument({ rawContent: yamlContent, sourceLabel: normalizedBlobId, walrusProvenance: provenance });
    deps.setState({ isOpen: true, status: "importing", mode: "import-walrus", message: `Importing ${normalizedBlobId}.`, result: null });
    const result = deps.onImportComplete(parsed.importedContract);
    const renamedDuringImport = result.originalImportedName !== undefined && result.originalImportedName !== result.importedName;
    deps.setState({
      isOpen: true,
      status: "success",
      mode: "import-walrus",
      message: renamedDuringImport
        ? `Imported ${result.originalImportedName} from Walrus as ${result.importedName} to avoid overwriting an existing contract.`
        : `Imported ${result.importedName} from Walrus.`,
      result: {
        importedName: result.importedName,
        originalImportedName: result.originalImportedName,
        walrusReference: provenance,
      },
    });
  } catch (error) {
    deps.setState({
      isOpen: true,
      status: "error",
      mode: "import-walrus",
      message: error instanceof Error ? error.message : "Could not import the requested Walrus graph.",
      result: null,
    });
  } finally {
    abortControllerRef.current = null;
  }
}

async function executePublishToWalrus(input: {
  readonly client: WalrusGraphClient;
  readonly createDocument: (source: PortableGraphSource) => ReturnType<typeof createPortableGraphDocument>;
  readonly draftContractName: string;
  readonly onPublishComplete: UseGraphTransferOptions["onPublishComplete"];
  readonly setState: SetTransferState;
  readonly walletBridge: GraphTransferWalletBridge;
}): Promise<void> {
  const { client, createDocument, draftContractName, onPublishComplete, setState, walletBridge } = input;
  if (walletBridge.accountAddress === null) {
    return;
  }

  const accountAddress = walletBridge.accountAddress;
  const config = getWalrusGraphConfig();
  try {
    setState({ isOpen: true, status: "publishing", mode: "publish", message: "Encoding graph for Walrus.", result: null });
    const yamlContent = serializeGraphYaml({ document: createDocument({ channel: "walrus-publish" }) }).content;
    const flow = client.createPublishFlow(yamlContent);
    await flow.encode();

    setState({ isOpen: true, status: "publishing", mode: "publish", message: "Waiting for wallet approval to register the blob.", result: null });
    const registerResult = await walletBridge.signAndExecuteTransaction(
      flow.register({
        deletable: config.deletable,
        epochs: config.epochs,
        owner: accountAddress,
      }),
    );

    setState({ isOpen: true, status: "publishing", mode: "publish", message: "Uploading graph data to Walrus.", result: null });
    const uploadResult = await flow.upload({ digest: registerResult.digest });
    if (!isWalrusUploadedStep(uploadResult)) {
      throw new Error("Walrus upload did not return the expected upload step.");
    }

    setState({ isOpen: true, status: "publishing", mode: "publish", message: "Waiting for wallet approval to certify the blob.", result: null });
    await walletBridge.signAndExecuteTransaction(flow.certify());

    const provenance: PublishedGraphProvenance = {
      blobId: uploadResult.blobId,
      blobObjectId: uploadResult.blobObjectId,
      network: config.network,
      publishedAt: new Date().toISOString(),
      contentType: "application/x.frontier-flow+yaml",
    };
    onPublishComplete(provenance);
    setState({
      isOpen: true,
      status: "success",
      mode: "publish",
      message: `Published ${draftContractName} to Walrus.`,
      result: { walrusReference: provenance },
    });
  } catch (error) {
    setState({
      isOpen: true,
      status: "error",
      mode: "publish",
      message: error instanceof Error ? error.message : "Could not publish this graph to Walrus.",
      result: null,
    });
  }
}

/**
 * Coordinates YAML and Walrus graph transfer flows for the contract drawer.
 */
export function useGraphTransfer(options: UseGraphTransferOptions) {
  const [state, setState] = useState<GraphTransferState>({
    isOpen: false, status: "idle", mode: null, message: null, result: null,
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const client = useMemo(() => (options.createClient ?? createWalrusGraphClient)(), [options.createClient]);
  const downloadFileFn = options.downloadFile ?? downloadGraphYamlFile;

  const createLiveContractSnapshot = useCallback((): NamedFlowContract => ({
    ...options.activeContract, nodes: [...options.nodes], edges: [...options.edges],
  }), [options.activeContract, options.edges, options.nodes]);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setState({ isOpen: false, status: "idle", mode: null, message: null, result: null });
  }, []);

  const open = useCallback((mode: GraphTransferMode) => {
    setState({ isOpen: true, status: "collecting-input", mode, message: null, result: null });
  }, []);

  const dismiss = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setState((currentState) => ({ ...currentState, isOpen: false }));
  }, []);

  const createDocument = useCallback((source: PortableGraphSource) => createPortableGraphDocument({
    appVersion: DEFAULT_APP_VERSION, contract: createLiveContractSnapshot(), source,
  }), [createLiveContractSnapshot]);

  const importDeps: TransferImportDeps = useMemo(
    () => ({ setState, onImportComplete: options.onImportComplete }),
    [options.onImportComplete],
  );

  const startExport = useCallback(() => {
    executeExport(setState, createDocument, downloadFileFn);
    return Promise.resolve();
  }, [createDocument, downloadFileFn]);

  const startImportFromFile = useCallback(
    (file: File) => executeImportFromFile(file, importDeps),
    [importDeps],
  );

  const startImportFromWalrus = useCallback(
    (blobId: string) => executeImportFromWalrus(blobId, client, abortControllerRef, importDeps),
    [client, importDeps],
  );

  const startPublishToWalrus = useCallback(async () => {
    if (options.walletBridge?.walletConnected !== true || options.walletBridge.accountAddress === null) {
      setState({ isOpen: true, status: "error", mode: "publish", message: "Connect a Sui wallet before publishing to Walrus.", result: null });
      return;
    }

    await executePublishToWalrus({
      client, createDocument, draftContractName: options.draftContractName,
      onPublishComplete: options.onPublishComplete, setState, walletBridge: options.walletBridge,
    });
  }, [client, createDocument, options]);

  return { state, open, dismiss, reset, startExport, startImportFromFile, startImportFromWalrus, startPublishToWalrus };
}
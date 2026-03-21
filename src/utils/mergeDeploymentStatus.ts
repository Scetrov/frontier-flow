import type { CompilationStatus, GeneratedContractArtifact } from "../compiler/types";

export function mergeDeploymentStatus(
  status: CompilationStatus,
  deploymentStatus: GeneratedContractArtifact["deploymentStatus"] | null,
): CompilationStatus {
  if (deploymentStatus == null) {
    return status;
  }

  const nextDeploymentStatus = deploymentStatus;

  if ((status.state !== "compiled" && status.state !== "error") || status.artifact === undefined) {
    return status;
  }

  if (status.artifact.artifactId === undefined || nextDeploymentStatus.artifactId !== status.artifact.artifactId) {
    return status;
  }

  return {
    ...status,
    artifact: {
      ...status.artifact,
      deploymentStatus: nextDeploymentStatus,
    },
  };
}
# Contract: Generated Contract Artifact

## Purpose

Defines the canonical artifact boundary shared by preview, compile, deploy-preparation, and extension-authorization preparation workflows.

## Producer

- DAG compiler pipeline

## Consumers

- Move source preview surface
- Build and compile workflow
- Deploy preparation workflow
- Extension registration or authorization readiness workflow
- Deterministic Vitest regression suite

## Required Fields

| Field                    | Required | Meaning                                                         |
| ------------------------ | -------- | --------------------------------------------------------------- |
| `artifactId`             | yes      | Stable identity for the generated package                       |
| `sourceDagId`            | yes      | Active graph or fixture identifier                              |
| `contractIdentity`       | yes      | Deterministic naming and identity payload                       |
| `sourceFiles`            | yes      | Full generated source content                                   |
| `manifest`               | yes      | Compile-ready package metadata and dependency references        |
| `traceSections`          | yes      | Stable graph-to-contract section mapping                        |
| `diagnostics`            | yes      | Current warnings and blockers tied to generation or compilation |
| `compileReadiness`       | yes      | Whether the artifact can be submitted to the compile workflow   |
| `authorizationReadiness` | yes      | Whether the artifact is attachable to an existing turret        |

## Invariants

- The same DAG state must always yield the same `artifactId`, identity payload, file ordering, and trace ordering.
- Preview, compile, deploy-preparation, and authorization-preparation flows must all consume the same artifact instance for the active DAG state.
- An artifact marked compile-ready must contain all metadata required by the existing compile workflow.
- An artifact may be compile-ready while authorization readiness remains blocked by external or user-supplied inputs.

## Failure Contract

- If artifact generation fails, no partial artifact may be treated as compile-ready.
- If external dependency resolution fails, diagnostics must remain attached to the artifact boundary instead of falling back to silent placeholder output.

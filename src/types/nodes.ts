/**
 * Describes a draggable node type displayed in the shell toolbox.
 */
export interface NodeDefinition {
  readonly type: string;
  readonly label: string;
  readonly description: string;
  readonly color: string;
}
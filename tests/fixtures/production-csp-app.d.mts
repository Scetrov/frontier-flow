export function readProductionContentSecurityPolicy(): string;

export function startProductionCspApp(options: {
  cert: Buffer | string;
  key: Buffer | string;
  distDir?: string;
  contentSecurityPolicy?: string;
}): Promise<{
  contentSecurityPolicy: string;
  origin: string;
  close: () => Promise<void>;
}>;

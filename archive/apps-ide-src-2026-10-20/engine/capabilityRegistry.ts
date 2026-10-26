const capabilities = new Map<string, string[]>();

export function registerCapabilities(elementId: string, caps: string[]): void {
  capabilities.set(elementId, caps);
}

export function resolveCapabilities(required: string[], available: string[]): string[] {
  return required.filter(r => available.includes(r));
}

export function getCapabilityProviders(capName: string): string[] {
  const providers: string[] = [];
  for (const [elId, caps] of capabilities.entries()) {
    if (caps.includes(capName)) providers.push(elId);
  }
  return providers;
}

export function buildCapabilityGraph(): Record<string, string[]> {
  return Object.fromEntries(capabilities);
}

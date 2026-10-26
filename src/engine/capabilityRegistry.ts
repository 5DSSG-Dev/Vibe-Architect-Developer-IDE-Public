const capabilities = new Map<string, string[]>();

export function registerCapabilities(elementId: string, caps: string[]): void {
  capabilities.set(elementId, caps);
}

/** Remove capabilities when the Element's final active contract is severed. */
export function unregisterCapabilities(elementId: string): void {
  capabilities.delete(elementId);
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

import type { PlatformAdapter } from './types.js';

const registry = new Map<string, () => PlatformAdapter>();

export function registerAdapter(hostname: string, factory: () => PlatformAdapter): void {
  registry.set(hostname, factory);
}

export function getAdapter(hostname: string): PlatformAdapter | null {
  const factory = registry.get(hostname);
  return factory ? factory() : null;
}

export function _resetForTesting(): void {
  registry.clear();
}

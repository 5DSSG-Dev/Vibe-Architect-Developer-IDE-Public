export type AssetOwnership = 'owned' | 'shared' | 'borrowed';

export interface AssetLease<T> {
  readonly key: string;
  readonly value: T;
  readonly ownership: AssetOwnership;
  readonly released: boolean;
  release(): void;
}

interface AssetRecord<T> {
  value: T;
  ownership: AssetOwnership;
  references: number;
  dispose?: (value: T) => void;
  clone?: (value: T) => T;
  disposeClone?: (value: T) => void;
}

/**
 * Explicit asset lifetime boundary.
 * - owned: disposed when evicted/manager disposed.
 * - shared: manager-owned cache entry, disposed only when the manager is disposed.
 * - borrowed: externally owned (for example gltfModelCache), never disposed here.
 */
export class SharedAssetManager {
  // Records are type-erased at the registry boundary; acquire<T> restores the
  // caller's registered type while preserving one runtime cache.
  private readonly records = new Map<string, AssetRecord<any>>();
  private disposed = false;

  register<T>(
    key: string,
    value: T,
    options: {
      ownership: AssetOwnership;
      dispose?: (value: T) => void;
      clone?: (value: T) => T;
      disposeClone?: (value: T) => void;
    }
  ): void {
    if (this.disposed) throw new Error('SharedAssetManager is disposed');
    if (this.records.has(key)) throw new Error(`Asset already registered: ${key}`);
    if (options.ownership !== 'borrowed' && !options.dispose) {
      throw new Error(`Managed asset requires a disposer: ${key}`);
    }
    this.records.set(key, { value, references: 0, ...options });
  }

  registerBorrowedCache<T>(
    cache: ReadonlyMap<string, T>,
    clone?: (value: T) => T,
    disposeClone?: (value: T) => void
  ): void {
    for (const [key, value] of cache) {
      if (!this.records.has(key)) this.register(key, value, { ownership: 'borrowed', clone, disposeClone });
    }
  }

  has(key: string): boolean {
    return this.records.has(key);
  }

  acquire<T>(key: string): AssetLease<T> {
    if (this.disposed) throw new Error('SharedAssetManager is disposed');
    const record = this.records.get(key) as AssetRecord<T> | undefined;
    if (!record) throw new Error(`Unknown asset: ${key}`);
    record.references += 1;
    const leasedValue = record.clone ? record.clone(record.value) : record.value;
    let released = false;
    return {
      key,
      value: leasedValue,
      ownership: record.ownership,
      get released() { return released; },
      release: () => {
        if (released) return;
        released = true;
        if (record.clone) record.disposeClone?.(leasedValue);
        record.references = Math.max(0, record.references - 1);
      }
    };
  }

  references(key: string): number {
    return this.records.get(key)?.references ?? 0;
  }

  evict(key: string): boolean {
    const record = this.records.get(key);
    if (!record || record.references > 0 || record.ownership !== 'owned') return false;
    record.dispose?.(record.value);
    this.records.delete(key);
    return true;
  }

  dispose(): void {
    if (this.disposed) return;
    for (const [key, record] of this.records) {
      if (record.references > 0) {
        console.warn(`[SharedAssetManager] disposing ${key} with ${record.references} active lease(s)`);
      }
      if (record.ownership !== 'borrowed') record.dispose?.(record.value);
    }
    this.records.clear();
    this.disposed = true;
  }
}

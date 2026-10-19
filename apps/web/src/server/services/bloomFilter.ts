/**
 * SentiMate Canonical Username Bloom Filter Implementation
 *
 * Design Invariants:
 * 1. Target false-positive probability (FPR): 1% (p = 0.01).
 * 2. Optimal parameters derived from information theory:
 *    m = ceil(-n * ln(p) / (ln(2)^2))  (~9.585 bits per element)
 *    k = ceil((m / n) * ln(2))         (7 hash functions for p = 0.01)
 * 3. Hashing: Kirsch-Mitzenmacher optimization using FNV-1a (32-bit) and Murmur3-like hash
 *    to generate k hash values: g_i(x) = (h1(x) + i * h2(x)) mod m.
 * 4. Conventional Bloom filters do NOT support deletions: deleted or renamed usernames
 *    remain in the filter until the next scheduled rebuild.
 * 5. The Bloom filter is strictly an optimization layer to eliminate database reads on
 *    absent usernames; it is NOT a security boundary or substitute for authoritative
 *    PostgreSQL UNIQUE constraints.
 */

export interface BloomFilterMetadata {
  filterVersion: string;         // '1.0'
  normalizationVersion: string;  // 'v1'
  targetFpr: number;             // 0.01
  capacity: number;              // n (max items before FPR degradation)
  itemCount: number;             // number of elements added
  bitSize: number;               // m (total bits in filter)
  hashCount: number;             // k (hash functions)
  builtAt: string;               // ISO timestamp of creation
  lastUpdatedAt: string;         // ISO timestamp of last item insertion
}

export interface SerializedBloomFilter {
  metadata: BloomFilterMetadata;
  bitArrayBase64: string;
}

export class UsernameBloomFilter {
  public readonly metadata: BloomFilterMetadata;
  private readonly bitArray: Uint8Array;

  constructor(capacity: number = 10000, targetFpr: number = 0.01) {
    if (capacity <= 0) capacity = 1000;
    if (targetFpr <= 0 || targetFpr >= 1) targetFpr = 0.01;

    // m = ceil(-n * ln(p) / (ln(2)^2))
    const m = Math.ceil((-capacity * Math.log(targetFpr)) / (Math.LN2 * Math.LN2));
    // k = round((m / n) * ln(2))
    const k = Math.round((m / capacity) * Math.LN2) || 7;

    const numBytes = Math.ceil(m / 8);
    this.bitArray = new Uint8Array(numBytes);

    const now = new Date().toISOString();
    this.metadata = {
      filterVersion: '1.0',
      normalizationVersion: 'v1',
      targetFpr,
      capacity,
      itemCount: 0,
      bitSize: m,
      hashCount: k,
      builtAt: now,
      lastUpdatedAt: now,
    };
  }

  /**
   * 32-bit FNV-1a Hash Algorithm
   */
  private static fnv1a(str: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  /**
   * 32-bit MurmurHash3-compatible mixer
   */
  private static murmur3(str: string, seed: number = 0x9747b28c): number {
    let h = seed ^ str.length;
    for (let i = 0; i < str.length; i++) {
      let k = str.charCodeAt(i);
      k = Math.imul(k, 0xcc9e2d51);
      k = (k << 15) | (k >>> 17);
      k = Math.imul(k, 0x1b873593);

      h ^= k;
      h = (h << 13) | (h >>> 19);
      h = (Math.imul(h, 5) + 0xe6546b64) | 0;
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  }

  /**
   * Compute k bit positions for a normalized string using Kirsch-Mitzenmacher optimization
   */
  private getBitIndices(normalizedInput: string): number[] {
    const h1 = UsernameBloomFilter.fnv1a(normalizedInput);
    const h2 = UsernameBloomFilter.murmur3(normalizedInput, 0x5bd1e995);
    const m = this.metadata.bitSize;
    const k = this.metadata.hashCount;

    const indices: number[] = new Array(k);
    for (let i = 0; i < k; i++) {
      // (h1 + i * h2) mod m, ensuring positive modulo
      const combined = (h1 + Math.imul(i, h2)) >>> 0;
      indices[i] = combined % m;
    }
    return indices;
  }

  /**
   * Add a normalized username into the filter
   */
  public add(normalizedUsername: string): void {
    if (!normalizedUsername) return;
    const indices = this.getBitIndices(normalizedUsername);
    for (const bitIndex of indices) {
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      this.bitArray[byteIndex] |= 1 << bitOffset;
    }
    this.metadata.itemCount++;
    this.metadata.lastUpdatedAt = new Date().toISOString();
  }

  /**
   * Test for membership:
   * Returns FALSE: Definitely not in set (no false negatives).
   * Returns TRUE: Possibly in set (with ~1% false positive probability).
   */
  public has(normalizedUsername: string): boolean {
    if (!normalizedUsername) return false;
    const indices = this.getBitIndices(normalizedUsername);
    for (const bitIndex of indices) {
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      if ((this.bitArray[byteIndex] & (1 << bitOffset)) === 0) {
        return false; // Definitely absent
      }
    }
    return true; // Possibly present
  }

  /**
   * Serialize filter state and metadata for backup or diagnostics
   */
  public serialize(): SerializedBloomFilter {
    const base64 = Buffer.from(this.bitArray).toString('base64');
    return {
      metadata: { ...this.metadata },
      bitArrayBase64: base64,
    };
  }

  /**
   * Rehydrate filter from serialized snapshot
   */
  public static deserialize(data: SerializedBloomFilter): UsernameBloomFilter {
    const filter = new UsernameBloomFilter(data.metadata.capacity, data.metadata.targetFpr);
    Object.assign(filter.metadata, data.metadata);

    const buffer = Buffer.from(data.bitArrayBase64, 'base64');
    const targetBytes = Math.min(buffer.length, filter.bitArray.length);
    for (let i = 0; i < targetBytes; i++) {
      filter.bitArray[i] = buffer[i];
    }
    return filter;
  }
}

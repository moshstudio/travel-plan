import localforage from "localforage";

interface LRUCacheOptions<T> {
  maxItems: number;
  storeName: string;
  defaultTTL?: number;
  cleanupInterval?: number; // Interval for automatic cleanup (ms)
}

interface CacheItem<T> {
  data: T;
  lastAccessed: number;
  createdAt: number;
  ttl?: number;
  accessCount: number; // For statistics
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  currentSize: number;
}

// Linked list node for efficient LRU tracking
class ListNode<K> {
  constructor(
    public key: K,
    public prev: ListNode<K> | null = null,
    public next: ListNode<K> | null = null
  ) {}
}

export class LRUCache<T> {
  private store: LocalForage;
  private maxItems: number;
  private defaultTTL?: number;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    currentSize: 0,
  };
  private cleanupTimer?: number;

  // LRU linked list pointers
  private head: ListNode<string> | null = null;
  private tail: ListNode<string> | null = null;
  private nodeMap: Map<string, ListNode<string>> = new Map();

  constructor(options: LRUCacheOptions<T>) {
    this.store = localforage.createInstance({
      name: "LRUCache",
      storeName: options.storeName,
    });
    this.maxItems = options.maxItems;
    this.defaultTTL = options.defaultTTL;

    // Initialize and load existing keys
    this.initialize().catch(console.error);

    // Setup automatic cleanup
    if (options.cleanupInterval) {
      this.cleanupTimer = window.setInterval(
        () => this.cleanupExpired(),
        options.cleanupInterval
      );
    }
  }

  private async initialize(): Promise<void> {
    const keys = await this.store.keys();
    this.stats.currentSize = keys.length;

    // Rebuild access order from stored items (may be slow for large caches)
    const items = await Promise.all(
      keys.map((key) => this.store.getItem<CacheItem<T>>(key))
    );

    // Sort by lastAccessed to rebuild LRU order
    const sorted = items
      .map((item, index) => ({
        key: keys[index],
        lastAccessed: item?.lastAccessed || 0,
      }))
      .sort((a, b) => a.lastAccessed - b.lastAccessed);

    // Rebuild linked list
    sorted.forEach(({ key }) => this.addToHead(key));
  }

  // Add key to the head of LRU list
  private addToHead(key: string): void {
    const newNode = new ListNode(key);
    this.nodeMap.set(key, newNode);

    if (!this.head) {
      this.head = this.tail = newNode;
    } else {
      newNode.next = this.head;
      this.head.prev = newNode;
      this.head = newNode;
    }
  }

  // Move existing node to head
  private moveToHead(key: string): void {
    const node = this.nodeMap.get(key);
    if (!node || node === this.head) return;

    // Remove from current position
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;

    // If it was the tail, update tail
    if (node === this.tail) {
      this.tail = node.prev;
    }

    // Add to head
    node.next = this.head;
    node.prev = null;
    if (this.head) this.head.prev = node;
    this.head = node;
  }

  // Remove tail node
  private removeTail(): string | null {
    if (!this.tail) return null;

    const key = this.tail.key;
    this.nodeMap.delete(key);

    if (this.tail.prev) {
      this.tail = this.tail.prev;
      this.tail.next = null;
    } else {
      this.head = this.tail = null;
    }

    return key;
  }

  // Remove specific key from LRU list
  private removeFromList(key: string): void {
    const node = this.nodeMap.get(key);
    if (!node) return;

    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;

    if (node === this.head) this.head = node.next;
    if (node === this.tail) this.tail = node.prev;

    this.nodeMap.delete(key);
  }

  async set(key: string, data: T, ttl?: number): Promise<void> {
    const now = Date.now();
    const item: CacheItem<T> = {
      data,
      lastAccessed: now,
      createdAt: now,
      ttl: ttl ?? this.defaultTTL,
      accessCount: 0,
    };

    await this.store.setItem(key, item);

    if (this.nodeMap.has(key)) {
      this.moveToHead(key);
    } else {
      this.addToHead(key);
      this.stats.currentSize++;

      // Evict if needed
      while (this.stats.currentSize > this.maxItems) {
        const tailKey = this.removeTail();
        if (tailKey) {
          await this.store.removeItem(tailKey);
          this.stats.currentSize--;
          this.stats.evictions++;
        }
      }
    }
  }

  async get(key: string): Promise<T | null> {
    const item = await this.store.getItem<CacheItem<T>>(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (item.ttl && Date.now() > item.createdAt + item.ttl) {
      await this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access info
    item.lastAccessed = Date.now();
    item.accessCount++;
    await this.store.setItem(key, item);

    this.moveToHead(key);
    this.stats.hits++;

    return item.data;
  }

  async delete(key: string): Promise<void> {
    await this.store.removeItem(key);
    this.removeFromList(key);
    this.stats.currentSize--;
  }

  async clear(): Promise<void> {
    await this.store.clear();
    this.head = this.tail = null;
    this.nodeMap.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      currentSize: 0,
    };
  }

  // Batch operations
  async setMany(
    items: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<void> {
    await Promise.all(
      items.map(({ key, value, ttl }) => this.set(key, value, ttl))
    );
  }

  async getMany(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    await Promise.all(
      keys.map(async (key) => {
        results.set(key, await this.get(key));
      })
    );
    return results;
  }

  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.delete(key)));
  }

  // Statistics
  getStats(): CacheStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
  }

  // Automatic cleanup
  private async cleanupExpired(): Promise<void> {
    const keys = await this.store.keys();
    const now = Date.now();

    await Promise.all(
      keys.map(async (key) => {
        const item = await this.store.getItem<CacheItem<T>>(key);
        if (item && item.ttl && now > item.createdAt + item.ttl) {
          await this.delete(key);
        }
      })
    );
  }

  // Dispose cleanup timer when cache is no longer needed
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

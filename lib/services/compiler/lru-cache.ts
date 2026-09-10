/**
 * High-Performance In-Memory LRU (Least Recently Used) Cache
 * Implemented using an Object-Oriented Doubly-Linked List + Hash Map data structure
 * Guarantees O(1) lookup, insertion, and eviction for compiled binary/execution results.
 */

class DoublyLinkedNode<K, V> {
  key: K;
  value: V;
  prev: DoublyLinkedNode<K, V> | null = null;
  next: DoublyLinkedNode<K, V> | null = null;

  constructor(key: K, value: V) {
    this.key = key;
    this.value = value;
  }
}

export class LRUExecutionCache<K, V> {
  private readonly capacity: number;
  private readonly map = new Map<K, DoublyLinkedNode<K, V>>();
  private head: DoublyLinkedNode<K, V> | null = null;
  private tail: DoublyLinkedNode<K, V> | null = null;

  constructor(capacity = 50) {
    this.capacity = capacity;
  }

  /** Retrieve item and promote it to head in O(1) */
  public get(key: K): V | null {
    const node = this.map.get(key);
    if (!node) return null;

    this.moveToHead(node);
    return node.value;
  }

  /** Insert or update item in O(1), evicting LRU tail if capacity is exceeded */
  public put(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.moveToHead(existing);
      return;
    }

    const newNode = new DoublyLinkedNode(key, value);
    this.map.set(key, newNode);
    this.addToHead(newNode);

    if (this.map.size > this.capacity) {
      this.evictTail();
    }
  }

  public clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  public size(): number {
    return this.map.size;
  }

  private addToHead(node: DoublyLinkedNode<K, V>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: DoublyLinkedNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private moveToHead(node: DoublyLinkedNode<K, V>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private evictTail(): void {
    if (!this.tail) return;
    this.map.delete(this.tail.key);
    this.removeNode(this.tail);
  }
}

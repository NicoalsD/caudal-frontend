/** Source of client UUIDs, injected so core stays free of `crypto` (architecture.md section 2). */
export interface IdGenerator {
  nextId(): string;
}

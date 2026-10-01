import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export interface ObjectStorage {
  put(key: string, content: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export class LocalObjectStorage implements ObjectStorage {
  constructor(private readonly root = path.join(process.cwd(), "uploads")) {}
  private safePath(key: string) {
    const target = path.resolve(this.root, key);
    if (!target.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Invalid storage key");
    return target;
  }
  async put(key: string, content: Buffer) { const target = this.safePath(key); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, content); }
  async get(key: string) { return readFile(this.safePath(key)); }
  async delete(key: string) { await unlink(this.safePath(key)); }
}

// The interface deliberately keeps S3-compatible storage replaceable. A production
// adapter can be introduced without changing ingestion or source-domain code.
export function objectStorage(): ObjectStorage { return new LocalObjectStorage(); }

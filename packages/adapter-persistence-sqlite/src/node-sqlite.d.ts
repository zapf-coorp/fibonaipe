declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(source: string): SqliteStatement;
    close(): void;
  }

  export interface SqliteStatement {
    run(...values: readonly unknown[]): unknown;
    get(...values: readonly unknown[]): unknown;
    all(...values: readonly unknown[]): unknown[];
  }
}

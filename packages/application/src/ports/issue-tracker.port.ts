import type { AppError, Result } from "@fibonaipe/domain";

export type IssueTrackerProvider = "manual" | "clickup" | "jira";

export interface ImportedItemCandidate {
  readonly title: string;
  readonly description?: string;
  readonly externalKey?: string;
  readonly externalUrl?: string;
}

export interface ImportRowWarning {
  readonly row: number;
  readonly code: "VALIDATION";
  readonly messageKey: string;
}

export interface ImportedBacklogBatch {
  readonly items: readonly ImportedItemCandidate[];
  readonly warnings: readonly ImportRowWarning[];
}

export type IssueTrackerImportInput =
  | { readonly kind: "text"; readonly rawText: string }
  | { readonly kind: "csv"; readonly csvContent: string; readonly delimiter?: string }
  | {
      readonly kind: "external";
      readonly encryptedToken: string;
      readonly workspaceOrProjectKey: string;
      readonly queryOrListId: string;
      readonly maxItems: number;
    };

export interface ExternalEstimateRef {
  readonly externalKey: string;
}

export interface IssueTracker {
  readonly provider: IssueTrackerProvider;
  importItems(input: IssueTrackerImportInput): Promise<Result<ImportedBacklogBatch, AppError>>;
  writeEstimate?(ref: ExternalEstimateRef, points: number): Promise<Result<void, AppError>>;
}

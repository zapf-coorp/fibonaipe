export class EstimateAudit {
  readonly itemId: string;
  readonly changedBy: string;
  readonly at: Date;
  readonly from: string;
  readonly to: string;

  private constructor(itemId: string, changedBy: string, at: Date, from: string, to: string) {
    this.itemId = itemId;
    this.changedBy = changedBy;
    this.at = at;
    this.from = from;
    this.to = to;
    Object.freeze(this);
  }

  static record(input: {
    itemId: string;
    changedBy: string;
    at: Date;
    from: string;
    to: string;
  }): EstimateAudit {
    return new EstimateAudit(input.itemId, input.changedBy, input.at, input.from, input.to);
  }
}

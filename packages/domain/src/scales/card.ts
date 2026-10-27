export interface NumericCard {
  readonly label: string;
  readonly numeric: number;
  readonly kind: "numeric";
}

export interface SpecialCard {
  readonly label: string;
  readonly numeric: null;
  readonly kind: "special";
}

export type Card = NumericCard | SpecialCard;

function specialCard(label: string): SpecialCard {
  const card: SpecialCard = { label, numeric: null, kind: "special" };
  Object.freeze(card);
  return card;
}

export const DoubtCard: SpecialCard = specialCard("?");
export const JokerCard: SpecialCard = specialCard("Coringa");
export const AfkCard: SpecialCard = specialCard("AFK");

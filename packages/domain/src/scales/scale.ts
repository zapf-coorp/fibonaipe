import type { Card } from "./card.js";

export interface Scale {
  readonly id: string;
  readonly name: string;
  readonly cards: readonly Card[];
  indexOf(label: string): number | null;
  distance(left: string, right: string): number | null;
}

class ScaleModel implements Scale {
  readonly id: string;
  readonly name: string;
  readonly cards: readonly Card[];

  private constructor(id: string, name: string, cards: readonly Card[]) {
    this.id = id;
    this.name = name;
    this.cards = cards;
  }

  indexOf(label: string): number | null {
    const index = this.cards.findIndex((card) => card.label === label);
    return index < 0 ? null : index;
  }

  distance(left: string, right: string): number | null {
    const start = this.indexOf(left);
    const end = this.indexOf(right);
    if (start === null || end === null) return null;
    return Math.abs(start - end);
  }

  static create(id: string, name: string, cards: readonly Card[]): Scale {
    const frozenCards = [...cards];
    Object.freeze(frozenCards);
    const scale = new ScaleModel(id, name, frozenCards);
    Object.freeze(scale);
    return scale;
  }
}

export function createScale(id: string, name: string, cards: readonly Card[]): Scale {
  return ScaleModel.create(id, name, cards);
}

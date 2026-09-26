import type { CardCategory, CardDetail, CardSummary } from '@/shared/types';

type TcgdexBrief = {
  id: string;
  name: string;
  image?: string;
  localId?: string;
};

type TcgdexCard = {
  id: string;
  localId?: string;
  name: string;
  image?: string;
  category?: string;
  illustrator?: string;
  rarity?: string;
  hp?: number | string;
  types?: string[];
  stage?: string;
  evolveFrom?: string;
  retreat?: number;
  regulationMark?: string;
  attacks?: Array<{
    name: string;
    cost?: string[];
    damage?: string | number;
    effect?: string;
  }>;
  abilities?: Array<{
    name: string;
    type?: string;
    effect?: string;
  }>;
  rules?: string[];
  set?: { id?: string; name?: string };
  energyType?: string;
};

function normalizeCategory(raw?: string): CardCategory {
  const v = (raw ?? '').toLowerCase();
  if (v.includes('pokemon') || v.includes('pokémon')) return 'Pokemon';
  if (v.includes('trainer')) return 'Trainer';
  if (v.includes('energy') || v.includes('energia')) return 'Energy';
  return 'Unknown';
}

export function isBasicEnergyCard(input: {
  category?: string;
  name?: string;
  stage?: string;
}): boolean {
  const category = normalizeCategory(input.category);
  if (category !== 'Energy') return false;
  const name = (input.name ?? '').toLowerCase();
  const stage = (input.stage ?? '').toLowerCase();
  const basicHints = ['basic', 'básica', 'basica', 'energia básica', 'energia basica'];
  if (stage && basicHints.some((h) => stage.includes(h))) return true;
  if (basicHints.some((h) => name.includes(h))) return true;
  // TCGdex basic Energy often named like "Fire Energy" / "Energia de Fogo" without Special
  const specialHints = ['special', 'especial', 'prism', 'unit'];
  if (specialHints.some((h) => name.includes(h) || stage.includes(h))) return false;
  return category === 'Energy';
}

function imageUrls(image?: string): { imageUrl: string | null; imageHighUrl: string | null } {
  if (!image) return { imageUrl: null, imageHighUrl: null };
  const base = image.replace(/\/$/, '');
  return {
    imageUrl: `${base}/low.webp`,
    imageHighUrl: `${base}/high.webp`,
  };
}

export function mapBriefToSummary(
  card: TcgdexBrief,
  displayName: string,
  extras?: Partial<CardSummary>,
): CardSummary {
  const images = imageUrls(card.image);
  return {
    id: card.id,
    name: card.name,
    displayName,
    ...images,
    types: extras?.types ?? [],
    rarity: extras?.rarity ?? null,
    setId: extras?.setId ?? null,
    setName: extras?.setName ?? null,
    localId: card.localId ?? extras?.localId ?? null,
    category: extras?.category ?? 'Unknown',
    isBasicEnergy: extras?.isBasicEnergy ?? false,
  };
}

export function mapCardToDetail(card: TcgdexCard, displayName: string): CardDetail {
  const images = imageUrls(card.image);
  const category = normalizeCategory(card.category);
  const isBasicEnergy = isBasicEnergyCard({
    category: card.category,
    name: card.name,
    stage: card.stage,
  });
  return {
    id: card.id,
    name: card.name,
    displayName,
    ...images,
    types: card.types ?? (card.energyType ? [card.energyType] : []),
    rarity: card.rarity ?? null,
    setId: card.set?.id ?? null,
    setName: card.set?.name ?? null,
    localId: card.localId ?? null,
    category,
    isBasicEnergy,
    hp: card.hp != null ? String(card.hp) : null,
    stage: card.stage ?? null,
    retreat: card.retreat ?? null,
    attacks: (card.attacks ?? []).map((a) => ({
      name: a.name,
      cost: a.cost ?? [],
      damage: a.damage != null ? String(a.damage) : null,
      effect: a.effect ?? null,
    })),
    abilities: (card.abilities ?? []).map((a) => ({
      name: a.name,
      type: a.type ?? null,
      effect: a.effect ?? null,
    })),
    rules: card.rules ?? [],
    evolveFrom: card.evolveFrom ?? null,
    illustrator: card.illustrator ?? null,
    regulationMark: card.regulationMark ?? null,
  };
}

export type { TcgdexBrief, TcgdexCard };

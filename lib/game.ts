import { products } from "@/lib/products";
import type { GameMode, Product } from "@/types/game";
import { getUtcDateKey, hashString, seededRandom } from "@/lib/utils";

export const ROUNDS_PER_GAME = 5;

export function getDailyNumber(date = new Date()): number {
  const start = Date.UTC(2025, 0, 1);
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((current - start) / 86_400_000) + 1;
}

export function getChallengeProducts(date = new Date()): Product[] {
  const random = seededRandom(hashString(`pricele-${getUtcDateKey(date)}`));
  const candidates = [...products];
  const selected: Product[] = [];
  while (selected.length < ROUNDS_PER_GAME && candidates.length > 0) {
    const index = Math.floor(random() * candidates.length);
    selected.push(candidates.splice(index, 1)[0]);
  }
  return selected;
}

export function getUnlimitedProducts(seed: string, count: number): Product[] {
  const random = seededRandom(hashString(seed));
  const candidates = [...products];
  const selected: Product[] = [];
  while (selected.length < count && candidates.length > 0) {
    const index = Math.floor(random() * candidates.length);
    selected.push(candidates.splice(index, 1)[0]);
  }
  return selected;
}

export function calculateScore(guess: number, actualPrice: number): {
  score: number;
  percentageError: number;
} {
  const percentageError = (Math.abs(guess - actualPrice) / actualPrice) * 100;
  const score = Math.max(0, Math.round(1000 - percentageError * 10));
  return { score, percentageError };
}

export function todayKey(): string {
  return getUtcDateKey();
}

export function modeLabel(mode: GameMode): string {
  return mode === "daily" ? "Daily challenge" : "Unlimited run";
}

export const CATEGORIES = [
  "Cars",
  "Phones",
  "Luxury",
  "Gaming",
  "Technology",
  "Fashion",
  "Watches",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type GameMode = "daily" | "unlimited";

export interface Product {
  id: string;
  name: string;
  image: string;
  actualPrice: number;
  category: Category;
}

export interface GuessResult {
  productId: string;
  guess: number;
  actualPrice: number;
  score: number;
  percentageError: number;
}

export interface GameStats {
  gamesPlayed: number;
  averageScore: number;
  bestScore: number;
  currentStreak: number;
  longestStreak: number;
  lastDailyDate: string | null;
  totalGuesses: number;
  perfectGuesses: number;
}

export interface LeaderboardEntry {
  score: number;
  date: string;
  mode: GameMode;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
}

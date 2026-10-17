"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  Flame,
  Gamepad2,
  Gift,
  ImageDown,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Moon,
  PartyPopper,
  RotateCcw,
  Share2,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calculateScore, getChallengeProducts, getDailyNumber, getPriceHint, getUnlimitedProducts, ROUNDS_PER_GAME } from "@/lib/game";
import type { ProductImageResult } from "@/lib/product-image";
import { canvasToBlob, copyShareCard, createShareCard } from "@/lib/share-card";
import {
  EMPTY_STATS,
  getAchievements,
  loadDailyProgress,
  loadLeaderboard,
  loadStats,
  saveCompletedGame,
  saveDailyProgress,
} from "@/lib/storage";
import { formatOrdinal, formatPrice, getUtcDateKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Achievement, GameMode, GameStats, GuessResult, Product } from "@/types/game";

type View = "game" | "stats";

function getGuessColor(score: number): string {
  if (score >= 800) return "text-emerald-300";
  if (score >= 400) return "text-amber-300";
  return "text-rose-300";
}

const productImageCache = new Map<string, ProductImageResult | null>();

function ProductPhoto({ product }: { product: Product }) {
  const [photo, setPhoto] = useState<ProductImageResult | null>(() => productImageCache.get(product.id) ?? null);
  const [searchComplete, setSearchComplete] = useState(() => productImageCache.has(product.id));

  useEffect(() => {
    if (productImageCache.has(product.id)) return;
    const controller = new AbortController();

    async function findPhoto() {
      try {
        const params = new URLSearchParams({ name: product.name, version: "2" });
        const response = await fetch(`/api/product-image?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Product image search returned ${response.status}.`);
        const result = await response.json() as { image?: ProductImageResult | null };
        if (result.image !== null && (!result.image || typeof result.image.url !== "string")) {
          throw new Error("Product image search returned an invalid result.");
        }
        productImageCache.set(product.id, result.image);
        setPhoto(result.image);
        setSearchComplete(true);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.error(`Could not find a matching photo for ${product.name}.`, error);
        setSearchComplete(true);
      }
    }

    void findPhoto();
    return () => controller.abort();
  }, [product.id, product.name]);

  if (photo) {
    return (
      <>
        <Image src={photo.url} alt={product.name} fill fetchPriority="high" sizes="(max-width: 640px) 100vw, 800px" className="object-cover opacity-85" />
        {photo.descriptionUrl && (
          <a
            href={photo.descriptionUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute right-3 top-3 max-w-[65%] truncate rounded-md border border-white/10 bg-black/45 px-2 py-1 text-[10px] text-white/75 backdrop-blur-md hover:text-white"
            title={`Photo by ${photo.attribution || "Wikimedia Commons"}${photo.license ? `, ${photo.license}` : ""}`}
          >
            {photo.attribution || "Wikimedia Commons"}{photo.license && ` · ${photo.license}`}
          </a>
        )}
      </>
    );
  }

  return (
    <div
      role="img"
      aria-label={searchComplete ? `No matching photo found for ${product.name}` : `Finding a photo of ${product.name}`}
      className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#17252a] via-[#10171f] to-[#1c1728]"
    >
      <span className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs font-medium text-white/70">
        {searchComplete ? "Product photo unavailable" : "Finding product photo…"}
      </span>
    </div>
  );
}

function playTone(success: boolean): void {
  try {
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(success ? 660 : 210, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(success ? 880 : 150, audio.currentTime + 0.14);
    gain.gain.setValueAtTime(0.08, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.18);
    oscillator.onended = () => void audio.close();
  } catch (error) {
    console.error("Could not play the game sound.", error);
  }
}

function StatTile({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-xs font-semibold uppercase tracking-[0.12em]">{label}</span>
        {icon}
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </Card>
  );
}

function Header({
  mode,
  onModeChange,
  onOpenStats,
  onOpenAchievements,
  soundEnabled,
  onToggleSound,
}: {
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
  onOpenStats: () => void;
  onOpenAchievements: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.055] bg-[#0b1016]/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-8">
        <button className="group flex items-center gap-2.5" onClick={() => onModeChange("daily")} aria-label="Pricele home">
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-300 text-[#0b1016] shadow-[0_0_24px_rgba(79,209,151,0.2)]">
            <Sparkles size={19} strokeWidth={2.5} />
          </span>
          <span className="text-lg font-bold tracking-[-0.06em] text-white">pricele<span className="text-emerald-300">.</span></span>
        </button>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 rounded-xl border border-white/[0.06] bg-white/[0.035] p-1 sm:flex" aria-label="Game mode">
          <button
            onClick={() => onModeChange("daily")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${mode === "daily" ? "bg-white/[0.09] text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
          >
            <Moon size={13} /> Daily
          </button>
          <button
            onClick={() => onModeChange("unlimited")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${mode === "unlimited" ? "bg-white/[0.09] text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
          >
            <Zap size={13} /> Unlimited
          </button>
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-9 text-slate-400" onClick={onToggleSound} aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}>
            {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </Button>
          <Button variant="ghost" size="icon" className="size-9 text-slate-400" onClick={onOpenAchievements} aria-label="Achievements">
            <Gift size={17} />
          </Button>
          <Button variant="ghost" size="icon" className="size-9 text-slate-400" onClick={onOpenStats} aria-label="Statistics">
            <BarChart3 size={17} />
          </Button>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl justify-center gap-2 px-4 pb-3 sm:hidden">
        <button onClick={() => onModeChange("daily")} className={`rounded-lg px-4 py-2 text-xs font-semibold ${mode === "daily" ? "bg-white/[0.09] text-white" : "text-slate-500"}`}>Daily</button>
        <button onClick={() => onModeChange("unlimited")} className={`rounded-lg px-4 py-2 text-xs font-semibold ${mode === "unlimited" ? "bg-white/[0.09] text-white" : "text-slate-500"}`}>Unlimited</button>
      </div>
    </header>
  );
}

function ResultModal({
  results,
  score,
  challengeNumber,
  mode,
  onPlayAgain,
}: {
  results: GuessResult[];
  score: number;
  challengeNumber: number;
  mode: GameMode;
  onPlayAgain: () => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const canvas = useMemo(() => createShareCard(results, score, challengeNumber), [results, score, challengeNumber]);
  const imageUrl = useMemo(() => canvas.toDataURL("image/png"), [canvas]);

  const copyText = async () => {
    const blocks = results.map((result) => result.score >= 800 ? "🟩" : result.score >= 400 ? "🟨" : "🟥");
    const text = `PRICELE #${challengeNumber}\n${blocks.map((block, index) => `${block} ${results[index].score}`).join("\n")}\n\nTOTAL: ${score.toLocaleString()}\nPlay Pricele!`;
    try {
      await navigator.clipboard.writeText(text);
      setFeedback("Result copied to clipboard");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not copy your result.");
    }
  };

  const share = async () => {
    try {
      if (navigator.share) {
        const text = `I scored ${score.toLocaleString()} on Pricele #${challengeNumber}!`;
        const file = new File([await canvasToBlob(canvas)], `pricele-${challengeNumber}.png`, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: "My Pricele result", text, url: window.location.href, files: [file] });
        } else {
          await navigator.share({ title: "My Pricele result", text, url: window.location.href });
        }
      } else {
        await copyText();
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not share your result.");
    }
  };

  const copyImage = async () => {
    setBusy(true);
    try {
      await copyShareCard(canvas);
      setFeedback("Image copied to clipboard");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not copy the image.");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    const link = document.createElement("a");
    link.download = `pricele-${challengeNumber}.png`;
    link.href = imageUrl;
    link.click();
    setFeedback("Your card is ready to share");
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="relative w-full max-w-xl rounded-t-[28px] border border-white/10 bg-[#10171f] p-5 shadow-2xl sm:rounded-[28px] sm:p-8" initial={{ y: 26, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 18, opacity: 0, scale: 0.98 }}>
        <button onClick={onPlayAgain} className="absolute right-5 top-5 grid size-9 place-items-center rounded-full bg-white/[0.06] text-slate-400 hover:text-white" aria-label="Close results"><X size={17} /></button>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300"><PartyPopper size={15} /> {mode === "daily" ? "Daily challenge complete" : "Run complete"}</div>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Nicely priced.</h2>
        <p className="mt-1 text-sm text-slate-400">You know your way around a price tag.</p>

        <div className="mt-6 grid grid-cols-5 gap-2">
          {results.map((result, index) => (
            <div key={result.productId} className="rounded-xl border border-white/[0.06] bg-white/[0.035] px-2 py-3 text-center">
              <div className={`text-xl font-bold tabular-nums ${getGuessColor(result.score)}`}>{result.score}</div>
              <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-600">Round {index + 1}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-end justify-between rounded-2xl bg-emerald-300/[0.08] px-5 py-4">
          <div><div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-emerald-300/70">Total score</div><div className="mt-1 text-4xl font-semibold tracking-tight text-white tabular-nums">{score.toLocaleString()}</div></div>
          <span className="mb-1 rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">of 5,000</span>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.08]"><Image src={imageUrl} alt="Your shareable Pricele score card" width={1080} height={1350} unoptimized className="h-auto max-h-52 w-full object-cover object-top" /></div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button variant="secondary" className="h-10 text-xs" onClick={() => void copyText()}><Link2 size={14} /> Copy result</Button>
          <Button variant="secondary" className="h-10 text-xs" onClick={download}><ImageDown size={14} /> Save card</Button>
          <Button variant="secondary" className="h-10 text-xs" onClick={() => void copyImage()} disabled={busy}><Check size={14} /> Copy image</Button>
          <Button className="h-10 text-xs" onClick={() => void share()}><Share2 size={14} /> Share</Button>
        </div>
        {feedback && <p className="mt-2 text-center text-xs text-emerald-300" role="status">{feedback}</p>}
        {mode === "unlimited" && <Button variant="ghost" className="mt-3 w-full text-xs" onClick={onPlayAgain}><RotateCcw size={14} /> Play another run</Button>}
      </motion.div>
    </motion.div>
  );
}

function SidePanel({ stats, leaderboard }: { stats: GameStats; leaderboard: ReturnType<typeof loadLeaderboard> }) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between"><div className="text-sm font-semibold text-white">Your stats</div><BarChart3 size={16} className="text-slate-600" /></div>
        <div className="mt-4 grid grid-cols-2 gap-y-4">
          <div><div className="text-2xl font-semibold text-white">{stats.gamesPlayed}</div><div className="mt-0.5 text-xs text-slate-500">Games played</div></div>
          <div><div className="text-2xl font-semibold text-white">{stats.averageScore.toLocaleString()}</div><div className="mt-0.5 text-xs text-slate-500">Average score</div></div>
          <div><div className="text-2xl font-semibold text-white">{stats.bestScore.toLocaleString()}</div><div className="mt-0.5 text-xs text-slate-500">Personal best</div></div>
          <div><div className="flex items-center gap-1.5 text-2xl font-semibold text-white">{stats.currentStreak}<Flame size={17} className="text-orange-300" /></div><div className="mt-0.5 text-xs text-slate-500">Day streak</div></div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex items-center justify-between"><div className="text-sm font-semibold text-white">Your best runs</div><span className="rounded-md bg-white/[0.055] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Local</span></div>
        {leaderboard.length ? (
          <div className="mt-4 space-y-3">
            {leaderboard.slice(0, 5).map((entry, index) => (
              <div key={`${entry.date}-${index}`} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3"><span className="w-4 text-slate-600">0{index + 1}</span><span className="text-slate-300">{entry.mode === "daily" ? "Daily" : "Unlimited"}</span></div>
                <span className="font-semibold tabular-nums text-white">{entry.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : <p className="mt-3 text-xs leading-5 text-slate-500">Finish a game to start your local leaderboard.</p>}
      </Card>
      <div className="flex items-center gap-2 px-2 text-[11px] text-slate-600"><LockKeyhole size={12} /> Your stats stay on this device.</div>
    </div>
  );
}

export function PriceleApp() {
  const [mode, setMode] = useState<GameMode>("daily");
  const [view, setView] = useState<View>("game");
  const [dailyProducts] = useState<Product[]>(() => getChallengeProducts());
  const [productsInGame, setProductsInGame] = useState<Product[]>([]);
  const [round, setRound] = useState(0);
  const [guessText, setGuessText] = useState("");
  const [results, setResults] = useState<GuessResult[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [stats, setStats] = useState<GameStats>(EMPTY_STATS);
  const [leaderboard, setLeaderboard] = useState<ReturnType<typeof loadLeaderboard>>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [modal, setModal] = useState<"results" | "achievements" | null>(null);
  const [achievementList, setAchievementList] = useState<Achievement[]>([]);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Local storage is only available in the browser, so hydrate it after SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore persistent client-side stats after hydration.
    setStats(loadStats());
    setLeaderboard(loadLeaderboard());
    setAchievementList(getAchievements(loadStats()));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (mode !== "daily") return;
    const todays = loadDailyProgress();
    if (!todays) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Start today's challenge after checking persisted progress.
      setProductsInGame(dailyProducts);
      return;
    }
    const restored = todays.products.map((id) => dailyProducts.find((product) => product.id === id)).filter((product): product is Product => Boolean(product));
    if (restored.length === ROUNDS_PER_GAME && todays.guesses.length > 0) {
      const restoredResults = todays.guesses.map((guess, index) => {
        const product = restored[index];
        const result = calculateScore(guess, product.actualPrice);
        return { productId: product.id, guess, actualPrice: product.actualPrice, ...result };
      });
      setProductsInGame(restored);
      setResults(restoredResults);
      setRound(Math.min(Math.max(restoredResults.length - 1, 0), ROUNDS_PER_GAME - 1));
      setRevealed(restoredResults.length > 0);
      if (restoredResults.length >= ROUNDS_PER_GAME) {
        setCompleted(true);
        setModal("results");
        const savedStats = loadStats();
        if (savedStats.lastDailyDate !== getUtcDateKey()) {
          const saved = saveCompletedGame(
            restoredResults.reduce((sum, result) => sum + result.score, 0),
            restoredResults.length,
            restoredResults.filter((result) => result.guess === result.actualPrice).length,
            "daily",
          );
          setStats(saved.stats);
          setLeaderboard(loadLeaderboard());
          setAchievementList(saved.achievements);
        }
      }
    } else {
      setProductsInGame(dailyProducts);
    }
  }, [dailyProducts, hydrated, mode]);

  const totalScore = results.reduce((sum, result) => sum + result.score, 0);
  const currentProduct = productsInGame[round];
  const dailyAlreadyPlayed = stats.lastDailyDate === getUtcDateKey();

  const startGame = useCallback((nextMode: GameMode) => {
    setMode(nextMode);
    setView("game");
    setError("");
    setModal(null);
    setGuessText("");
    setResults([]);
    setRound(0);
    setRevealed(false);
    setCompleted(false);
    if (nextMode === "daily") {
      const progress = loadDailyProgress();
      if (progress && progress.guesses.length > 0) {
        setProductsInGame(progress.products.map((id) => dailyProducts.find((product) => product.id === id)).filter((product): product is Product => Boolean(product)));
        setRound(Math.min(progress.guesses.length - 1, ROUNDS_PER_GAME - 1));
        const restoredResults = progress.guesses.map((guess, index) => {
          const product = dailyProducts.find((product) => product.id === progress.products[index]);
          if (!product) return null;
          return { productId: product.id, guess, actualPrice: product.actualPrice, ...calculateScore(guess, product.actualPrice) };
        }).filter((result): result is GuessResult => Boolean(result));
        setResults(restoredResults);
        setRevealed(true);
        if (progress.guesses.length >= ROUNDS_PER_GAME) {
          setCompleted(true);
          setModal("results");
          const savedStats = loadStats();
          if (savedStats.lastDailyDate !== getUtcDateKey()) {
            const saved = saveCompletedGame(
              restoredResults.reduce((sum, result) => sum + result.score, 0),
              restoredResults.length,
              restoredResults.filter((result) => result.guess === result.actualPrice).length,
              "daily",
            );
            setStats(saved.stats);
            setLeaderboard(loadLeaderboard());
            setAchievementList(saved.achievements);
          }
        }
      } else {
        setProductsInGame(dailyProducts);
      }
    } else {
      const seed = `${Date.now()}-${Math.random()}`;
      setProductsInGame(getUnlimitedProducts(seed, ROUNDS_PER_GAME));
    }
  }, [dailyProducts]);

  const submitGuess = () => {
    if (!currentProduct || revealed || completed) return;
    const parsed = Number(guessText.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1_000_000_000) {
      setError("Enter a price greater than $0.");
      inputRef.current?.focus();
      return;
    }
    setError("");
    const normalizedGuess = Math.round(parsed);
    const score = calculateScore(normalizedGuess, currentProduct.actualPrice);
    const result: GuessResult = {
      productId: currentProduct.id,
      guess: normalizedGuess,
      actualPrice: currentProduct.actualPrice,
      ...score,
    };
    const nextResults = [...results, result];
    setResults(nextResults);
    setGuessText("");
    setRevealed(true);
    if (soundEnabled) playTone(result.score >= 400);
    if (mode === "daily") saveDailyProgress(productsInGame, [...nextResults.map((item) => item.guess)]);
  };

  const finishGame = useCallback((finalResults: GuessResult[]) => {
    if (completed || finalResults.length < ROUNDS_PER_GAME) return;
    setCompleted(true);
    const finalScore = finalResults.reduce((sum, result) => sum + result.score, 0);
    const saved = saveCompletedGame(finalScore, finalResults.length, finalResults.filter((result) => result.guess === result.actualPrice).length, mode);
    setStats(saved.stats);
    setLeaderboard(loadLeaderboard());
    setAchievementList(saved.achievements);
    setModal("results");
  }, [completed, mode]);

  const advanceRound = () => {
    if (results.length >= ROUNDS_PER_GAME) {
      finishGame(results);
      return;
    }
    setRound((current) => current + 1);
    setRevealed(false);
    setGuessText("");
    window.setTimeout(() => inputRef.current?.focus(), 50);
  };

  const openStats = () => {
    setStats(loadStats());
    setLeaderboard(loadLeaderboard());
    setView("stats");
  };

  if (!hydrated || !currentProduct) {
    return <div className="grid min-h-screen place-items-center bg-[#0b1016] text-slate-400"><LoaderCircle className="animate-spin" size={24} /></div>;
  }

  const progress = Math.round((results.length / ROUNDS_PER_GAME) * 100);
  const dayNumber = getDailyNumber();
  const nextResult = results[results.length - 1];

  return (
    <div className="min-h-screen bg-[#0b1016] text-slate-100 selection:bg-emerald-300/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-36 top-24 size-[420px] rounded-full bg-emerald-500/[0.045] blur-[120px]" />
        <div className="absolute -right-36 top-[400px] size-[420px] rounded-full bg-violet-500/[0.035] blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.025] [background-image:radial-gradient(#fff_0.6px,transparent_0.6px)] [background-size:18px_18px]" />
      </div>

      <Header mode={mode} onModeChange={startGame} onOpenStats={openStats} onOpenAchievements={() => { setAchievementList(getAchievements(loadStats())); setModal("achievements"); }} soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled((enabled) => !enabled)} />

      <main className="relative mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-8 sm:pt-12">
        {view === "stats" ? (
          <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => setView("game")} className="mb-7 flex items-center gap-2 text-sm text-slate-500 transition hover:text-white"><ArrowLeft size={15} /> Back to the game</button>
            <div className="max-w-2xl">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Your progress</div>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">Getting warmer.</h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">Every estimate makes you a little sharper. Here’s how you’re doing.</p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Games played" value={stats.gamesPlayed.toLocaleString()} detail="All finished runs" icon={<Gamepad2 size={16} />} />
              <StatTile label="Average score" value={stats.averageScore.toLocaleString()} detail="Out of 5,000" icon={<BarChart3 size={16} />} />
              <StatTile label="Best score" value={stats.bestScore.toLocaleString()} detail="Your personal best" icon={<Sparkles size={16} />} />
              <StatTile label="Current streak" value={`${stats.currentStreak} days`} detail={`Longest: ${stats.longestStreak} days`} icon={<Flame size={16} />} />
            </div>
            <div className="mt-10 grid gap-8 md:grid-cols-[1fr_340px]">
              <div><h2 className="mb-4 text-sm font-semibold text-white">Achievements</h2><div className="grid gap-3 sm:grid-cols-2">{getAchievements(stats).map((achievement) => <Card key={achievement.id} className="flex items-center gap-4 p-4"><div className={`grid size-10 shrink-0 place-items-center rounded-xl ${achievement.unlocked ? "bg-emerald-300/10 text-emerald-300" : "bg-white/[0.04] text-slate-600"}`}>{achievement.unlocked ? <Check size={18} /> : <LockKeyhole size={16} />}</div><div><div className={`text-sm font-semibold ${achievement.unlocked ? "text-white" : "text-slate-500"}`}>{achievement.title}</div><div className="mt-1 text-xs text-slate-600">{achievement.description}</div></div></Card>)}</div></div>
              <SidePanel stats={stats} leaderboard={leaderboard} />
            </div>
          </motion.section>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-16">
            <section className="min-w-0">
              <div className="mb-7 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-300">
                    {mode === "daily" ? <><Moon size={13} /> Daily challenge</> : <><Zap size={13} /> Unlimited mode</>}
                  </div>
                  <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">{mode === "daily" ? `Pricele ${formatOrdinal(dayNumber)}` : "Name that price."}</h1>
                </div>
                {mode === "daily" && <div className="hidden rounded-xl border border-white/[0.07] bg-white/[0.035] px-3.5 py-2 text-right sm:block"><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Today&apos;s date</div><div className="mt-0.5 text-xs font-medium text-slate-300">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</div></div>}
              </div>

              <Card className="overflow-hidden">
                <div className="flex items-center justify-between px-5 pb-3 pt-5 sm:px-7 sm:pt-6">
                  <div className="text-xs font-semibold text-slate-400">ROUND <span className="ml-1 text-white">{String(Math.min(round + 1, ROUNDS_PER_GAME)).padStart(2, "0")}<span className="text-slate-600"> / {ROUNDS_PER_GAME}</span></span></div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">{mode === "daily" ? <LockKeyhole size={12} /> : <Zap size={12} className="text-amber-300" />}{mode === "daily" ? "Same for everyone" : "Just for fun"}</div>
                </div>
                <div className="px-5 pb-5 sm:px-7">
                  <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]"><motion.div className="h-full rounded-full bg-emerald-300" animate={{ width: `${progress}%` }} transition={{ duration: 0.45 }} /></div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div key={currentProduct.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }}>
                    <div className="relative mx-4 h-56 overflow-hidden rounded-xl bg-[#0c1117] sm:mx-7 sm:h-[310px]">
                      <ProductPhoto key={currentProduct.id} product={currentProduct} />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#070b10] via-[#070b10]/10 to-transparent" />
                      <div className="absolute left-4 top-4 rounded-lg border border-white/10 bg-black/35 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/80 backdrop-blur-md">{currentProduct.category}</div>
                      <div className="absolute bottom-5 left-5 right-5 sm:bottom-6 sm:left-7">
                        <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/60">How much is it?</div>
                        <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-3xl">{currentProduct.name}</h2>
                      </div>
                    </div>

                    <div className="px-5 pb-6 pt-5 sm:px-7 sm:pb-7">
                      {!revealed ? (
                        <>
                          <p className="mb-3 flex items-center gap-2 rounded-xl border border-violet-300/10 bg-violet-300/[0.045] px-4 py-3 text-xs text-slate-300">
                            <Sparkles size={14} className="shrink-0 text-violet-200" />
                            <span><span className="mr-1 font-semibold text-violet-200">Price hint:</span>{getPriceHint(currentProduct.actualPrice)}</span>
                          </p>
                          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); submitGuess(); }}>
                            <div className="relative flex-1">
                              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-500">$</span>
                              <Input ref={inputRef} type="text" inputMode="decimal" autoComplete="off" placeholder="Your best guess" value={guessText} onChange={(event) => { setGuessText(event.target.value); setError(""); }} className="pl-9 pr-4" aria-label="Your price guess" aria-invalid={Boolean(error)} />
                            </div>
                            <Button type="submit" size="lg" className="h-14 sm:w-40">Lock it in <ArrowRight size={16} /></Button>
                          </form>
                          {error && <p className="mt-2 text-xs text-rose-300" role="alert">{error}</p>}
                          <p className="mt-3 text-center text-[11px] text-slate-600">No pressure. Your best guess is your best guess.</p>
                        </>
                      ) : (
                        <div className="rounded-xl border border-emerald-300/10 bg-emerald-300/[0.045] p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div><div className="text-xs font-medium text-slate-400">Actual price <span className="text-slate-600">·</span> Your guess {formatPrice(nextResult?.guess ?? 0)}</div><div className="mt-1 text-3xl font-semibold tracking-tight text-white">{formatPrice(currentProduct.actualPrice)}</div></div>
                            <div className="text-right"><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">You scored</div><motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`mt-1 text-3xl font-bold tabular-nums ${getGuessColor(nextResult?.score ?? 0)}`}>{nextResult?.score ?? 0}<span className="ml-1 text-xs font-semibold text-slate-600">pts</span></motion.div></div>
                          </div>
                          <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-3 text-xs"><span className="text-slate-500">You were {formatPrice(Math.abs((nextResult?.guess ?? 0) - currentProduct.actualPrice))} off</span><span className={`font-semibold ${getGuessColor(nextResult?.score ?? 0)}`}>{((nextResult?.percentageError ?? 0)).toFixed(1)}% away</span></div>
                          <Button onClick={advanceRound} className="mt-4 w-full">{results.length >= ROUNDS_PER_GAME ? "See your results" : "Next product"} <ArrowRight size={15} /></Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </Card>

              <div className="mt-4 flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-xs text-slate-600"><Sparkles size={13} className="text-emerald-300/60" /> Perfect guess = 1,000 points</div>
                <div className="text-xs text-slate-600">Score <span className="ml-1 font-semibold tabular-nums text-slate-300">{totalScore.toLocaleString()}</span></div>
              </div>

              <div className="mt-9 flex gap-3 rounded-2xl border border-white/[0.055] bg-white/[0.025] p-4 sm:p-5">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-violet-300/[0.08] text-violet-200"><Sparkles size={15} /></span>
                <div><div className="text-xs font-semibold text-slate-300">A little price intuition goes a long way.</div><p className="mt-1 text-xs leading-5 text-slate-600">Five everyday and extraordinary things. One number. How close can you get?</p></div>
              </div>
            </section>

            <aside className="hidden space-y-4 lg:block">
              <SidePanel stats={stats} leaderboard={leaderboard} />
              <Card className="overflow-hidden p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-white"><Flame size={16} className="text-orange-300" /> Keep your streak alive</div>
                <p className="mt-2 text-xs leading-5 text-slate-500">{dailyAlreadyPlayed ? "You're all set for today. See you tomorrow!" : "Come back tomorrow for a brand-new set of prices and keep your daily streak going."}</p>
              </Card>
            </aside>
          </div>
        )}
        <footer className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/[0.05] pt-5 text-[11px] text-slate-600 sm:flex-row">
          <div className="flex items-center gap-2"><span className="font-semibold tracking-tight text-slate-400">pricele.</span><span>© 2026 Pricele</span></div>
          <div className="flex items-center gap-4"><span>A little game about big guesses.</span><span className="hidden sm:inline">All prices in USD</span></div>
        </footer>
      </main>

      <AnimatePresence>
        {modal === "results" && <ResultModal results={results} score={totalScore} challengeNumber={dayNumber} mode={mode} onPlayAgain={() => mode === "daily" ? setModal(null) : startGame("unlimited")} />}
        {modal === "achievements" && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#10171f] p-6 shadow-2xl sm:p-8">
              <div className="flex items-center justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">Milestones</div><h2 className="mt-2 text-2xl font-semibold text-white">Achievements</h2></div><button onClick={() => setModal(null)} className="grid size-9 place-items-center rounded-full bg-white/[0.06] text-slate-400 hover:text-white" aria-label="Close achievements"><X size={17} /></button></div>
              <div className="mt-6 space-y-3">{achievementList.map((achievement) => <div key={achievement.id} className={`flex items-center gap-4 rounded-xl border p-4 ${achievement.unlocked ? "border-emerald-300/15 bg-emerald-300/[0.045]" : "border-white/[0.06] bg-white/[0.025]"}`}><div className={`grid size-10 place-items-center rounded-xl ${achievement.unlocked ? "bg-emerald-300/10 text-emerald-300" : "bg-white/[0.04] text-slate-600"}`}>{achievement.unlocked ? <Check size={17} /> : <LockKeyhole size={16} />}</div><div><div className={`text-sm font-semibold ${achievement.unlocked ? "text-white" : "text-slate-500"}`}>{achievement.title}</div><div className="mt-1 text-xs text-slate-600">{achievement.description}</div></div><div className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-slate-600">{achievement.unlocked ? "Unlocked" : "Locked"}</div></div>)}</div>
              <Button variant="secondary" className="mt-6 w-full" onClick={() => setModal(null)}>Got it</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

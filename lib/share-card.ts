import type { GuessResult } from "@/types/game";

const COLORS = {
  background: "#0b1016",
  panel: "#141b24",
  green: "#55d69e",
  yellow: "#ffc970",
  red: "#ff7f83",
  white: "#f7f8fa",
  muted: "#8995a2",
};

export function createShareCard(
  results: GuessResult[],
  totalScore: number,
  challengeNumber: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable in this browser.");

  const gradient = context.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, "#121e25");
  gradient.addColorStop(0.55, COLORS.background);
  gradient.addColorStop(1, "#151321");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.textBaseline = "top";
  context.fillStyle = COLORS.green;
  context.font = "700 34px Arial, sans-serif";
  context.fillText("PRICELE", 80, 85);
  context.fillStyle = COLORS.muted;
  context.font = "500 25px Arial, sans-serif";
  context.textAlign = "right";
  context.fillText(`#${challengeNumber}`, 1000, 93);

  context.textAlign = "left";
  context.fillStyle = COLORS.white;
  context.font = "700 62px Arial, sans-serif";
  context.fillText("The price is", 80, 190);
  context.fillStyle = COLORS.green;
  context.fillText("almost right.", 80, 263);

  results.forEach((result, index) => {
    const y = 385 + index * 116;
    context.fillStyle = COLORS.panel;
    context.beginPath();
    context.roundRect(80, y, 920, 84, 22);
    context.fill();
    context.fillStyle = result.score >= 800 ? COLORS.green : result.score >= 400 ? COLORS.yellow : COLORS.red;
    context.beginPath();
    context.roundRect(105, y + 24, 34, 34, 10);
    context.fill();
    context.fillStyle = COLORS.white;
    context.font = "600 29px Arial, sans-serif";
    context.fillText(`${result.score.toLocaleString("en-US")} pts`, 168, y + 27);
    context.fillStyle = COLORS.muted;
    context.textAlign = "right";
    context.font = "500 25px Arial, sans-serif";
    context.fillText(`Round ${index + 1}`, 970, y + 29);
    context.textAlign = "left";
  });

  context.fillStyle = COLORS.white;
  context.font = "700 31px Arial, sans-serif";
  context.fillText("TOTAL SCORE", 80, 1000);
  context.fillStyle = COLORS.green;
  context.font = "700 92px Arial, sans-serif";
  context.fillText(totalScore.toLocaleString("en-US"), 80, 1050);
  context.fillStyle = COLORS.muted;
  context.font = "500 26px Arial, sans-serif";
  context.fillText("How well do you know what things cost?", 80, 1190);
  context.fillText("Play at pricele.game", 80, 1240);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("Could not create the share image."));
    }, "image/png");
  });
}

export async function copyShareCard(canvas: HTMLCanvasElement): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("Image copying is not supported by this browser.");
  }
  const blob = await canvasToBlob(canvas);
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

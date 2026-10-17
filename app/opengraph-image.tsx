import { ImageResponse } from "next/og";

export const alt = "Pricele — the daily price guessing game";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #101a20 0%, #0b1016 55%, #171322 100%)",
          color: "#f7f8fa",
          fontFamily: "Arial",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px", color: "#6ee7b7", fontSize: 30, fontWeight: 700 }}>
          <span>PRICELE</span>
        </div>
        <div style={{ marginTop: 48, fontSize: 72, fontWeight: 700, letterSpacing: "-4px" }}>How well do you</div>
        <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: "-4px", color: "#6ee7b7" }}>know what things cost?</div>
        <div style={{ marginTop: 32, color: "#9ba6b1", fontSize: 26 }}>Five products. Five guesses. One daily challenge.</div>
      </div>
    ),
    size,
  );
}

import { ImageResponse } from "next/og";
import { MONORCH_LOGO_PATH } from "@/components/monorch-logo";
import { siteConfig } from "@/lib/site";

export const runtime = "edge";
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
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
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(145deg, #0a1a14 0%, #0f2a1f 45%, #12281c 100%)",
          color: "#e8f0ea",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="42" height="50" viewBox="0 0 46 55" fill="none">
            <path d={MONORCH_LOGO_PATH} fill="#b4f05a" />
          </svg>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#b4f05a",
              fontWeight: 600,
            }}
          >
            Monorch
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, maxWidth: 900 }}>
            AI control plane for TypeScript
          </div>
          <div style={{ fontSize: 28, color: "#a8bdb0", maxWidth: 820, lineHeight: 1.35 }}>
            Agents, tools, and graphs as a library. Rust engine underneath. Bring your own Fastify
            or Hono.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#7f9a8a" }}>@monorch/ai</div>
      </div>
    ),
    { ...size },
  );
}

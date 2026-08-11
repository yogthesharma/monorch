import { ImageResponse } from "next/og";
import { MONORCH_LOGO_PATH } from "@/components/monorch-logo";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a1a14",
          borderRadius: 36,
        }}
      >
        <svg width="92" height="110" viewBox="0 0 46 55" fill="none">
          <path d={MONORCH_LOGO_PATH} fill="#b4f05a" />
        </svg>
      </div>
    ),
    { ...size },
  );
}

import { ImageResponse } from "next/og";

// iOS の「ホーム画面に追加」で使われるアイコン（角丸はOSが自動で付ける）
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
          background: "#2563eb",
        }}
      >
        <div
          style={{
            color: "white",
            fontSize: 108,
            fontWeight: 900,
            fontFamily: "sans-serif",
            lineHeight: 1,
          }}
        >
          日
        </div>
      </div>
    ),
    size
  );
}

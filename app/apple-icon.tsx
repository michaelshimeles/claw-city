import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 120,
          background: "linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "32px",
          fontFamily: "system-ui, sans-serif",
          fontWeight: "bold",
          color: "#ffffff",
        }}
      >
        C
      </div>
    ),
    {
      ...size,
    }
  );
}

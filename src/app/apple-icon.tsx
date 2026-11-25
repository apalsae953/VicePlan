import { ImageResponse } from "next/og";

/*
 * Icono para la pantalla de inicio de iOS/Android (180×180). Mismo diseño que
 * `icon.svg`: tres columnas de tablero sobre el índigo de la marca. Sin
 * esquinas redondeadas: el sistema aplica su propia máscara.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const BARS = [
  { height: 90, opacity: 1 },
  { height: 51, opacity: 0.8 },
  { height: 73, opacity: 0.65 },
];

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 10,
          paddingTop: 45,
          background: "#5e6ad2",
        }}
      >
        {BARS.map((bar, i) => (
          <div
            key={i}
            style={{
              width: 25,
              height: bar.height,
              borderRadius: 8,
              background: "#f7f8f8",
              opacity: bar.opacity,
            }}
          />
        ))}
      </div>
    ),
    { ...size },
  );
}

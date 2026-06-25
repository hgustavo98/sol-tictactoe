export type HardwareAccelStatus = "ok" | "software" | "unavailable";

const SOFTWARE_RENDERER = [
  /swiftshader/i,
  /llvmpipe/i,
  /softpipe/i,
  /software/i,
  /mesa offscreen/i,
  /microsoft basic render driver/i,
  /virgl/i,
  /apple software renderer/i,
];

function getWebGlContext(canvas: HTMLCanvasElement) {
  return (
    canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) ??
    canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true }) ??
    canvas.getContext("webgl2") ??
    canvas.getContext("webgl")
  );
}

/** Detecta renderização por software ou WebGL indisponível (aceleração HW desligada). */
export function detectHardwareAcceleration(): HardwareAccelStatus {
  if (typeof document === "undefined") return "ok";

  try {
    const canvas = document.createElement("canvas");
    const gl = getWebGlContext(canvas);
    if (!gl) return "unavailable";

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return "ok";

    const vendor = String(
      gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) ?? "",
    );
    const renderer = String(
      gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? "",
    );
    const label = `${vendor} ${renderer}`;

    if (SOFTWARE_RENDERER.some((pattern) => pattern.test(label))) {
      return "software";
    }

    return "ok";
  } catch {
    return "unavailable";
  }
}

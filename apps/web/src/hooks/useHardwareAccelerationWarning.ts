import { useCallback, useEffect, useState } from "react";
import {
  detectHardwareAcceleration,
  type HardwareAccelStatus,
} from "../utils/detectHardwareAcceleration";

export function useHardwareAccelerationWarning() {
  const [status, setStatus] = useState<HardwareAccelStatus>("ok");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setStatus(detectHardwareAcceleration());
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const visible = !dismissed && status !== "ok";

  return { status, visible, dismiss };
}

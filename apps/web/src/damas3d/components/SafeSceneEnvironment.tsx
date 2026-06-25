import { Component, Suspense, type ReactNode } from "react";
import { Environment } from "@react-three/drei";

class EnvironmentBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

/** HDR env map — optional; board still renders if CDN/CSP blocks the fetch. */
export function SafeSceneEnvironment() {
  return (
    <EnvironmentBoundary>
      <Suspense fallback={null}>
        <Environment preset="city" />
      </Suspense>
    </EnvironmentBoundary>
  );
}

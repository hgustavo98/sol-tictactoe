/// <reference types="vite/client" />

declare module "*.gltf?url" {
  const src: string;
  export default src;
}

declare module "*.wav?url" {
  const src: string;
  export default src;
}

declare module "*.mp3?url" {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_RPC_URL?: string;
  readonly VITE_PROGRAM_ID?: string;
  readonly VITE_MOCK_ESCROW?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

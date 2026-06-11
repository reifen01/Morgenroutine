/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite/client" />

declare const __BUILD_VERSION__: string;

declare module "*.md?raw" {
  const content: string;
  export default content;
}

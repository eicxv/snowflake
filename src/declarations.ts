declare module "*?raw" {
  const content: string;
  export default content;
}

declare module "fxhash" {
  global {
    interface Window {
      fxrand(): number;
      fxhash: string;
      $fxhashFeatures: Record<string, string>;
      isFxpreview: boolean;
      fxpreview(): void;
    }
  }
}

declare module "quagga" {
  interface QuaggaConfig {
    inputStream?: {
      name?: string;
      type?: "LiveStream" | "ImageStream" | "VideoStream";
      target?: Element;
      constraints?: MediaTrackConstraints;
    };
    decoder?: { readers?: string[] };
    locator?: { patchSize?: string; halfSample?: boolean };
    locate?: boolean;
    numOfWorkers?: number;
    frequency?: number;
  }

  interface QuaggaResult {
    codeResult: { code: string; format: string };
  }

  const Quagga: {
    init(config: QuaggaConfig, callback: (error?: Error | null) => void): void;
    start(): void;
    stop(): void;
    onDetected(callback: (result: QuaggaResult) => void): void;
  };
  export default Quagga;
}
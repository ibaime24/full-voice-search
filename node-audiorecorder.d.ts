declare module 'node-audiorecorder' {
  export default class AudioRecorder {
    constructor(options: any, logger?: any);
    start(): AudioRecorder;
    stop(): void;
    stream(): NodeJS.ReadableStream;
  }
} 
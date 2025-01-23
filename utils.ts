import chalk from "chalk";
import boxen from "boxen";
import { z } from "zod";
import * as fs from "fs";
import { OpenAI } from "openai";
import { Page } from "@browserbasehq/stagehand";

/**
 * Existing utility: announces a message in a box.
 */
export function announce(message: string, title?: string) {
  console.log(
    boxen(message, {
      padding: 1,
      margin: 3,
      title: title || "Stagehand",
    })
  );
}

/**
 * Existing utility: Retrieve an environment variable, or throw if it's missing.
 */
export function getEnvVar(name: string, required = true): string | undefined {
  const value = process.env[name];
  if (!value && required) {
    throw new Error(`${name} not found in environment variables`);
  }
  return value;
}

/**
 * Existing utility: Validate data against a Zod schema.
 */
export function validateZodSchema(schema: z.ZodTypeAny, data: unknown) {
  try {
    schema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Dynamically import and return the AudioRecorder constructor.
 */
export async function loadAudioRecorder() {
  const { default: AudioRecorder } = await import("node-audiorecorder");
  return AudioRecorder;
}

/**
 * Record audio from the microphone and save it as a file (default mp3).
 * @param filePath - Path to save the audio file.
 * @param duration - Duration of the recording in seconds (default 20).
 */
export async function recordAudio(filePath: string, duration = 20): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const AudioRecorder = await loadAudioRecorder();
      const options = {
        program: "rec",
        device: null,
        bits: 16,
        channels: 1,
        encoding: "signed-integer",
        rate: 16000,
        type: "mp3",
        silence: 2,
        thresholdStart: 0.5,
        thresholdStop: 0.5,
        keepSilence: true
      };

      const audioRecorder = new AudioRecorder(options, console);
      const writeStream = fs.createWriteStream(filePath);

      console.log(chalk.yellow("Recording audio..."));
      audioRecorder.start().stream().pipe(writeStream);

      audioRecorder.stream().on("error", (err: Error) => {
        console.error(chalk.red("Recording error:"), err);
        reject(err);
      });

      audioRecorder.stream().on("end", () => {
        console.log(chalk.green("Recording complete."));
        resolve();
      });

      setTimeout(() => {
        audioRecorder.stop();
      }, duration * 1000);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Use OpenAI's Whisper API to transcribe an audio file to text.
 * @param audioFilePath - Path to the audio file to transcribe.
 * @returns The transcribed text.
 */
export async function transcribeAudio(audioFilePath: string): Promise<string> {
  try {
    const client = new OpenAI();
    const audioFile = fs.createReadStream(audioFilePath);

    console.log(chalk.yellow("Transcribing audio..."));
    const transcription = await client.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
      response_format: "text"
    });

    console.log(chalk.green("Transcribed text:"), transcription);
    return transcription;
  } catch (error) {
    console.error(chalk.red("Error transcribing audio:"), error);
    throw error;
  }
}

/**
 * Execute a given instruction by using Stagehand's AI capabilities.
 * @param commandText - The text instruction (transcribed).
 * @param page - The Stagehand (Playwright) page object.
 */
export async function executeAction(commandText: string, page: Page) {
  try {
    console.log(chalk.green("Executing command:"), commandText);
    const actResult = await page.act({
      action: commandText,
    });
    console.log(
      chalk.green("Action complete using Stagehand."),
      "\n",
      chalk.gray(actResult)
    );
  } catch (error) {
    console.error(chalk.red("Error executing action:"), error);
  }
}

/**
 * Combine all steps of voice command handling:
 * 1. Record
 * 2. Transcribe
 * 3. Execute
 * 4. Cleanup
 */
export async function handleVoiceCommand(
  page: Page,
  audioFilePath = "command.mp3"
) {
  try {
    await recordAudio(audioFilePath);
    const transcribedText = await transcribeAudio(audioFilePath);
    console.log(transcribedText);
    await executeAction(transcribedText, page);
    fs.unlinkSync(audioFilePath);
  } catch (error) {
    console.error(chalk.red("Error handling voice command:"), error);
    if (fs.existsSync(audioFilePath)) fs.unlinkSync(audioFilePath);
  }
}

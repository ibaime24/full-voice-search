/**
 * 🤘 Welcome to Stagehand!
 *
 * TO RUN THIS PROJECT:
 * ```
 * npm install
 * npm run start
 * ```
 *
 * To edit config, see `stagehand.config.ts`
 *
 * In this quickstart, we'll be automating a browser session to show you the power of Playwright and Stagehand's AI features.
 *
 * 1. Go to https://docs.browserbase.com/
 * 2. Use `extract` to find information about the quickstart
 * 3. Use `observe` to find the links under the 'Guides' section
 * 4. Use Playwright to click the first link. If it fails, use `act` to gracefully fallback to Stagehand AI.
 */

import { Page, BrowserContext, Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import chalk from "chalk";
import boxen from "boxen";
import dotenv from "dotenv";
import * as fs from 'fs';
import { OpenAI } from 'openai';

dotenv.config();

/**
 * Dynamically import and return the AudioRecorder constructor
 */
async function loadAudioRecorder() {
    const { default: AudioRecorder } = await import('node-audiorecorder');
    return AudioRecorder;
}

/**
 * Record audio from the microphone and save it as a file (default mp3).
 * @param filePath - Path to save the audio file.
 * @param duration - Duration of the recording in seconds.
 */
async function recordAudio(filePath: string, duration = 20): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const AudioRecorder = await loadAudioRecorder();

            const options = {
                program: 'rec',
                device: null,
                bits: 16,
                channels: 1,
                encoding: 'signed-integer',
                rate: 16000,
                type: 'mp3',
                silence: 2,
                thresholdStart: 0.5,
                thresholdStop: 0.5,
                keepSilence: true
            };

            const audioRecorder = new AudioRecorder(options, console);
            const writeStream = fs.createWriteStream(filePath);

            console.log(chalk.yellow("Recording audio..."));
            audioRecorder.start().stream().pipe(writeStream);

            audioRecorder.stream().on('error', (err: Error) => {
                console.error(chalk.red("Recording error:"), err);
                reject(err);
            });

            audioRecorder.stream().on('end', () => {
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
async function transcribeAudio(audioFilePath: string): Promise<string> {
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
async function executeAction(commandText: string, page: Page) {
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
async function handleVoiceCommand(page: Page, audioFilePath = "command.mp3") {
    try {
        // 1. Record Audio
        await recordAudio(audioFilePath);

        // 2. Transcribe Audio
        const transcribedText = await transcribeAudio(audioFilePath);
        console.log(transcribedText)

        // 3. Execute Command
        await executeAction(transcribedText, page);

        // 4. Cleanup
        fs.unlinkSync(audioFilePath);
    } catch (error) {
        console.error(chalk.red("Error handling voice command:"), error);
        if (fs.existsSync(audioFilePath)) fs.unlinkSync(audioFilePath);
    }
}

export async function main({
  page,
  context,
  stagehand,
  isFirstLoad = true,
}: {
  page: Page;
  context: BrowserContext;
  stagehand: Stagehand;
  isFirstLoad?: boolean;
}) {
  console.log(
    [
      `🤘 ${chalk.yellow("Welcome to Stagehand!")}`,
      "",
      "Stagehand is a tool that allows you to automate browser interactions using voice commands."
    ].join("\n")
  );

  // Navigate to Google only on the first load
  if (isFirstLoad) {
    try {
      await page.goto('https://www.google.com');
    } catch (error) {
      await page.act({
        action: "navigate to google.com",
      });
    }
  }

  try {
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
  } catch (error) {
    await page.act({
      action: "scroll to the top of the page",
    });
  }

  // Handle voice command end-to-end
  await handleVoiceCommand(page);

  // Log a message indicating the function will be called again
  console.log(chalk.blue("Re-executing main function..."));

  // Call the main function again to make it recursive, setting isFirstLoad to false
  await main({ page, context, stagehand, isFirstLoad: false });
}

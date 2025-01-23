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
import { handleVoiceCommand, loadAudioRecorder, recordAudio, transcribeAudio, executeAction } from "./utils.js";


dotenv.config();

/**
 * Combine all steps of voice command handling:
 * 1. Record
 * 2. Transcribe
 * 3. Execute
 * 4. Cleanup
 */

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
            `🤘 ${chalk.yellow("Welcome to Tet!")}`,
            "",
            "Tet is a tool that allows you to automate browser interactions using voice commands."
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

    // Handle voice command end-to-end
    await handleVoiceCommand(page);

    // Log a message indicating the function will be called again
    console.log(chalk.blue("Re-executing main function..."));

    // Call the main function again (recursive), setting isFirstLoad to false
    await main({ page, context, stagehand, isFirstLoad: false });
}

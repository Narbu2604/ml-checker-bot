// Load environment variables from .env file
require('dotenv').config();

// Import required libraries
const TelegramBot = require('node-telegram-bot-api'); // Telegram bot library
const puppeteer = require('puppeteer-core'); // Puppeteer core library (without the bundled Chromium)
const chrome = require('chrome-aws-lambda'); // To get the correct Chromium executable in the cloud

// Set up Telegram bot using token from environment variables
const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

// Function to check User ID and Zone ID using Puppeteer
bot.onText(/\/check (.+)/, async (msg, match) => {
  const id = msg.chat.id;
  const userInput = match[1];  // Extract the User ID and Zone ID from the message
  const [userId, zoneId] = userInput.split(' ');  // Split them by space

  // The URL to the website we are scraping
  const url = `https://pizzoshop.com/mlchecker`;

  // Launch Puppeteer with the correct Chromium binary for cloud environments (using chrome-aws-lambda)
  const browser = await puppeteer.launch({
    headless: true,  // Run in headless mode (no GUI)
    executablePath: await chrome.executablePath,  // Use the chromium executable path from chrome-aws-lambda
    args: chrome.args,  // Pass the arguments required by chrome-aws-lambda
    defaultViewport: chrome.defaultViewport,  // Set default viewport
  });

  const page = await browser.newPage();  // Create a new page in the browser

  try {
    // Navigate to the URL
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Wait for the User ID and Zone ID input fields to appear
    await page.waitForSelector('input[name="user_id"]'); // Update if necessary
    await page.waitForSelector('input[name="zone_id"]'); // Update if necessary

    // Type the User ID and Zone ID into the respective input fields
    await page.type('input[name="user_id"]', userId); // Update the selector if necessary
    await page.type('input[name="zone_id"]', zoneId); // Update the selector if necessary

    // Wait for the "Check Account" button to be visible and then click it
    await page.waitForSelector('button[type="submit"]');  // Update if necessary
    await page.click('button[type="submit"]');  // Click the button to check the account

    // Wait for the page to load the result or an error message
    await page.waitForSelector('.result-class, .error-class'); // Modify selectors if necessary

    // Check if there's an error message
    const errorMessage = await page.$eval('.error-class', (el) => el.innerText); // Modify selector if necessary
    if (errorMessage) {
      bot.sendMessage(id, `❌ Invalid User ID or Zone ID. Please check and try again.`);
      return;
    }

    // Scrape the nickname and region ID from the page
    const result = await page.evaluate(() => {
      const nickname = document.querySelector('.nickname-class').innerText; // Replace with actual selector
      const region = document.querySelector('.region-id-class').innerText;  // Replace with actual selector
      return { nickname, region };
    });

    // Send the result back to the user
    bot.sendMessage(id, `🧑‍💻 Here are the results:\n\nNickname: ${result.nickname}\nRegion ID: ${result.region}`);
  } catch (err) {
    // Handle any errors that occur during the process
    console.error('Error fetching the data:', err);
    bot.sendMessage(id, "❌ Error: Unable to fetch the data. Please try again later.");
  } finally {
    // Close the browser after scraping
    await browser.close();
  }
});

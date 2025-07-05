// index.js

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const puppeteer = require('puppeteer');

// Set up Telegram bot
const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

// Function to check User ID and Zone ID using Puppeteer
bot.onText(/\/check (.+)/, async (msg, match) => {
  const id = msg.chat.id;
  const userInput = match[1];  // Example: "233520426 9223"
  const [userId, zoneId] = userInput.split(' ');

  // Construct the URL
  const url = `https://pizzoshop.com/mlchecker`;

  // Start Puppeteer to scrape the result
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate to the URL
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Wait for the User ID and Zone ID input fields to load
    await page.waitForSelector('input[name="user_id"]'); // Replace with actual selector if needed
    await page.waitForSelector('input[name="zone_id"]'); // Replace with actual selector if needed

    // Type the User ID and Zone ID into the input fields
    await page.type('input[name="user_id"]', userId); // Adjust the selector to match
    await page.type('input[name="zone_id"]', zoneId); // Adjust the selector to match

    // Wait for the Check Account button to be visible and click it
    await page.waitForSelector('button[type="submit"]'); // Adjust selector to match the "Check Account" button
    await page.click('button[type="submit"]'); // Click the "Check Account" button

    // Wait for the page to load the result or the error message
    await page.waitForSelector('.result-class, .error-class'); // Modify the selectors to check for error or result

    // Check for error message
    const errorMessage = await page.$eval('.error-class', (el) => el.innerText); // Adjust error selector if needed
    if (errorMessage) {
      bot.sendMessage(id, `❌ Invalid User ID or Zone ID. Please check and try again.`);
      return;
    }

    // Scrape the nickname and region ID
    const result = await page.evaluate(() => {
      const nickname = document.querySelector('.nickname-class').innerText; // Replace with actual selector
      const region = document.querySelector('.region-id-class').innerText;  // Replace with actual selector
      return { nickname, region };
    });

    // Send back the result to the user
    bot.sendMessage(id, `🧑‍💻 Here are the results:\n\nNickname: ${result.nickname}\nRegion ID: ${result.region}`);
  } catch (err) {
    console.error('Error fetching the data:', err);
    bot.sendMessage(id, "❌ Error: Unable to fetch the data. Please try again later.");
  } finally {
    await browser.close();  // Close Puppeteer browser
  }
});

const gplay = require('google-play-scraper').default || require('google-play-scraper');
const fs = require('fs');
const yaml = require('js-yaml');
const download = require('download');
const path = require('path');

// --- Configuration ---
const CONFIG_FILE = '_config.yml';
const ASSETS_DIR = 'assets';
const ICON_FILENAME = 'appicon.png';
const SCREENSHOT_DIR = path.join(ASSETS_DIR, 'screenshot');

// --- Helper Functions ---

async function downloadFile(url, folder, filename) {
    try {
        await download(url, folder, { filename: filename });
        console.log(`✅ Downloaded: ${path.join(folder, filename)}`);
    } catch (e) {
        console.error(`⚠️ Failed to download ${url}: ${e.message}`);
    }
}



async function main() {
    const appId = process.argv[2];

    if (!appId) {
        console.error("❌ Usage: node fetch-app-data.js <com.package.name>");
        process.exit(1);
    }

    console.log(`🔍 Fetching data for: ${appId} from Google Play...`);

    try {
        const appData = await gplay.app({ appId: appId, lang: 'es', country: 'mx' });

        console.log(`📱 Found app: ${appData.title}`);

        // 1. Download Icon
        if (appData.icon) {
            await downloadFile(appData.icon, ASSETS_DIR, ICON_FILENAME);
        }

        // 2. Download Screenshots (Up to 5)
        if (appData.screenshots && appData.screenshots.length > 0) {
            // Clear screenshot dir first to avoid clutter
            if (fs.existsSync(SCREENSHOT_DIR)) {
                fs.rmSync(SCREENSHOT_DIR, { recursive: true, force: true });
            }
            fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

            const sharp = require('sharp');
            const limit = 5;
            let savedCount = 0;

            console.log("🖼️ Processing screenshots (filtering for portrait)...");

            for (let i = 0; i < appData.screenshots.length && savedCount < limit; i++) {
                const screenUrl = appData.screenshots[i];
                const ext = path.extname(screenUrl) || '.webp';
                const tempPath = path.join(SCREENSHOT_DIR, `temp_${i}${ext}`);

                try {
                    await downloadFile(screenUrl, SCREENSHOT_DIR, `temp_${i}${ext}`);

                    // Validate image dimensions
                    const metadata = await sharp(tempPath).metadata();

                    if (metadata.height > metadata.width) {
                        // Portrait - Keep it
                        const finalPath = path.join(SCREENSHOT_DIR, `screen${savedCount + 1}${ext}`);
                        fs.renameSync(tempPath, finalPath);
                        console.log(`✅ Kept portrait screenshot: screen${savedCount + 1}${ext} (${metadata.width}x${metadata.height})`);
                        savedCount++;
                    } else {
                        // Landscape/Square - Discard
                        fs.unlinkSync(tempPath);
                        console.log(`🗑️ Discarded non-portrait screenshot (${metadata.width}x${metadata.height})`);
                    }

                } catch (err) {
                    console.error(`⚠️ Error processing screenshot ${i}: ${err.message}`);
                    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                }
            }

            if (savedCount === 0) {
                console.log("⚠️ No valid portrait screenshots found. You may need to upload one manually.");
            }
        }

        // 3. Update Config
        await updateConfig(appData);

        console.log("\n🎉 Done! Now run 'bundle exec jekyll serve' to review changes.");

    } catch (e) {
        console.error(`❌ Error fetching app data: ${e.message}`);
        if (e.message.includes('App not found')) {
            console.log("💡 Tip: Double check the package name and ensure the app is available in the selected store.");
        }
    }
}

async function updateConfig(appData) {
    try {
        let fileContent = fs.readFileSync(CONFIG_FILE, 'utf8');

        console.log("📝 Updating _config.yml...");

        const replacements = [
            { key: 'app_name', value: appData.title },
            { key: 'app_description', value: appData.summary },
            { key: 'playstore_link', value: appData.url },
            { key: 'app_price', value: appData.free ? 'Gratis' : (appData.priceText || appData.price) },
            { key: 'app_icon', value: `assets/${ICON_FILENAME}` },
            { key: 'developer_name', value: appData.developer },
            { key: 'your_name', value: appData.developer },
            { key: 'page_title', value: appData.title },
            // Add localized fields
            { key: 'changelog_title', value: "Novedades" },
            { key: 'latest_changes', value: appData.recentChanges || "" }
        ];

        let specificReplacementsMade = false;

        for (const item of replacements) {
            const regex = new RegExp(`^${item.key}\\s*:.*$`, 'm');
            if (regex.test(fileContent)) {
                // Use simple string replacement for known scalar values to preserve comments
                // For multi-line strings (like recentChanges), this might be tricky with regex 
                // but typically config.yml entry is single line or quoted. 
                // JSON.stringify handles escaping quotes.
                const safeValue = JSON.stringify(item.value);
                fileContent = fileContent.replace(regex, `${item.key.padEnd(38)}: ${item.value}`);
                specificReplacementsMade = true;
            } else if (item.key === 'changelog_title' || item.key === 'latest_changes') {
                // If key doesn't exist, append it (only for new optional fields)
                fileContent += `\n${item.key.padEnd(38)}: ${item.value}`;
                console.log(`➕ Added new key: ${item.key}`);
            }
        }

        fs.writeFileSync(CONFIG_FILE, fileContent, 'utf8');
        console.log(`✅ Updated ${CONFIG_FILE} successfully.`);

    } catch (e) {
        console.error(`❌ Error updating config: ${e.message}`);
    }
}

main();

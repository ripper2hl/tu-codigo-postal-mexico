const gplay = require('google-play-scraper').default || require('google-play-scraper');
const fs = require('fs');
const download = require('download');
const path = require('path');
const sharp = require('sharp');
const yaml = require('js-yaml');

// --- Configuration ---
const CONFIG_FILE = '_config.yml';
const ASSETS_DIR = 'assets';
const SCREENSHOT_DIR = path.join(ASSETS_DIR, 'screenshot');
const ICON_FILENAME_BASE = 'appicon';

// --- Helper Functions ---

/**
 * Downloads an image to a buffer, saves the original, and generates an optimized WebP version.
 * @param {string} url - The URL of the image to download.
 * @param {string} folder - The directory to save the files in.
 * @param {string} filenameBase - The base filename (without extension).
 * @param {object} options - Options for processing (e.g., resize).
 */
async function processAndSaveImage(url, folder, filenameBase, options = {}) {
    try {
        const buffer = await download(url);

        // Determine original extension or default to .png
        let ext = path.extname(url).split('?')[0];
        if (!ext) ext = '.png';

        const originalFilename = `${filenameBase}${ext}`;
        const webpFilename = `${filenameBase}.webp`;
        const originalPath = path.join(folder, originalFilename);
        const webpPath = path.join(folder, webpFilename);

        // 1. Save Original
        fs.writeFileSync(originalPath, buffer);
        console.log(`✅ Saved Original: ${originalPath}`);

        // 2. Generate and Save WebP
        let pipeline = sharp(buffer);

        if (options.resize) {
            pipeline = pipeline.resize(options.resize.width, options.resize.height, {
                fit: 'cover'
            });
        }

        await pipeline
            .webp({ quality: 80 })
            .toFile(webpPath);

        console.log(`✨ Saved Optimized: ${webpPath}`);

    } catch (e) {
        console.error(`⚠️ Failed to process image from ${url}: ${e.message}`);
    }
}

/**
 * Scans the assets directory for existing PNG/JPG files and generates WebP versions.
 * Does NOT delete original files.
 */
async function processLegacyAssets() {
    if (!fs.existsSync(ASSETS_DIR)) return;

    console.log("🕰️ Scanning for legacy assets to optimize...");
    const files = fs.readdirSync(ASSETS_DIR);

    for (const file of files) {
        const filePath = path.join(ASSETS_DIR, file);
        const ext = path.extname(file).toLowerCase();

        // Skip directories and non-image files
        if (fs.statSync(filePath).isDirectory()) continue;
        if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue;

        const basename = path.basename(file, ext);
        const webpPath = path.join(ASSETS_DIR, `${basename}.webp`);

        // Check if WebP already exists
        if (fs.existsSync(webpPath)) {
            continue;
        }

        try {
            await sharp(filePath)
                .webp({ quality: 80 })
                .toFile(webpPath);
            console.log(`✨ Generated WebP for legacy asset: ${file} -> ${basename}.webp`);
        } catch (e) {
            console.error(`⚠️ Failed to optimize legacy asset ${file}: ${e.message}`);
        }
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

        // Ensure directories exist
        if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

        // 1. Process Icon
        if (appData.icon) {
            console.log("🖼️ Processing App Icon...");
            await processAndSaveImage(appData.icon, ASSETS_DIR, ICON_FILENAME_BASE, {
                resize: { width: 512, height: 512 }
            });
        }

        // 2. Process Screenshots (Up to 5)
        if (appData.screenshots && appData.screenshots.length > 0) {
            // Clear screenshot dir first to start fresh (for screens)
            if (fs.existsSync(SCREENSHOT_DIR)) {
                fs.rmSync(SCREENSHOT_DIR, { recursive: true, force: true });
            }
            fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

            const limit = 5;
            let savedCount = 0;

            console.log("🖼️ Processing screenshots (filtering for portrait)...");

            for (let i = 0; i < appData.screenshots.length && savedCount < limit; i++) {
                const screenUrl = appData.screenshots[i];

                try {
                    // Download to buffer first to check dimensions
                    const buffer = await download(screenUrl);
                    const metadata = await sharp(buffer).metadata();

                    if (metadata.height > metadata.width) {
                        // Portrait - Keep and Process
                        const filenameBase = `screen${savedCount + 1}`;

                        // Save Original
                        let ext = path.extname(screenUrl).split('?')[0] || '.png';
                        if (ext === '.') ext = '.png'; // handle edge case

                        fs.writeFileSync(path.join(SCREENSHOT_DIR, `${filenameBase}${ext}`), buffer);

                        // Save WebP
                        await sharp(buffer)
                            .webp({ quality: 80 })
                            .toFile(path.join(SCREENSHOT_DIR, `${filenameBase}.webp`));

                        console.log(`✅ Processed portrait screenshot: ${filenameBase} (${metadata.width}x${metadata.height})`);
                        savedCount++;
                    } else {
                        console.log(`🗑️ Discarded non-portrait screenshot (${metadata.width}x${metadata.height})`);
                    }

                } catch (err) {
                    console.error(`⚠️ Error processing screenshot ${i}: ${err.message}`);
                }
            }

            if (savedCount === 0) {
                console.log("⚠️ No valid portrait screenshots found. You may need to upload one manually.");
            }
        }

        // 3. Process Legacy Assets
        await processLegacyAssets();

        // 4. Update Config
        await updateConfig(appData);

        console.log("\n🎉 Done! Now run 'bundle exec jekyll serve' to review changes.");

    } catch (e) {
        console.error(`❌ Error fetching app data: ${e.message}`);
        if (e.message && e.message.includes('App not found')) {
            console.log("💡 Tip: Double check the package name and ensure the app is available in the selected store.");
        }
    }
}

async function updateConfig(appData) {
    try {
        let fileContent = fs.readFileSync(CONFIG_FILE, 'utf8');

        console.log("📝 Updating _config.yml...");

        // Helper to escape strings for YAML if needed
        const cleanString = (str) => {
            if (!str) return '""';
            return JSON.stringify(str);
        };

        const replacements = [
            { key: 'app_name', value: appData.title },
            { key: 'app_description', value: appData.summary },
            { key: 'playstore_link', value: appData.url },
            { key: 'app_price', value: appData.free ? 'Gratis' : (appData.priceText || appData.price) },
            { key: 'app_icon', value: `assets/${ICON_FILENAME_BASE}.webp` }, // Point to WebP
            { key: 'developer_name', value: appData.developer },
            { key: 'your_name', value: appData.developer },
            { key: 'page_title', value: appData.title },
            // Add localized fields
            { key: 'changelog_title', value: "Novedades" },
            { key: 'latest_changes', value: appData.recentChanges || "" }
        ];

        for (const item of replacements) {
            const regex = new RegExp(`^${item.key}\\s*:.*$`, 'm');
            // We use simple string concatenation if it's a simple value, 
            // or JSON.stringify if it contains special chars to be safe-ish for YAML.
            let safeValue = item.value;
            if (typeof safeValue === 'string' && (safeValue.includes(':') || safeValue.includes('\n') || safeValue.includes('"'))) {
                safeValue = JSON.stringify(safeValue);
            }

            if (regex.test(fileContent)) {
                fileContent = fileContent.replace(regex, `${item.key}: ${safeValue}`);
            } else if (item.key === 'changelog_title' || item.key === 'latest_changes') {
                // Check if key already exists to avoid duplicates if regex failed for some reason
                if (fileContent.indexOf(`${item.key}:`) === -1) {
                    fileContent += `\n${item.key}: ${safeValue}`;
                    console.log(`➕ Added new key: ${item.key}`);
                }
            }
        }

        fs.writeFileSync(CONFIG_FILE, fileContent, 'utf8');
        console.log(`✅ Updated ${CONFIG_FILE} successfully.`);

    } catch (e) {
        console.error(`❌ Error updating config: ${e.message}`);
    }
}

main();

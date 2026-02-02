# Automatic Play Store Landing Page
**Create and deploy an Android app landing page on GitHub Pages in only five minutes.**

Designed for GitHub Pages for super easy set up.

🔧 **Fork** this repo

🗝 **Configure** app details in `_config.yml`

📲 **Upload** video preview or screenshot to `assets/`

🎨 **Customise** site in `_config.yml` (no HTML/CSS)

📝 **Write Privacy Policy** as markdown in `privacypolicy.md`

🕒 **Keep a changelog** in `CHANGELOG.md`

✅ **Site becomes live** at GitHub Pages repository URL, e.g. `https://your-username.github.io/your-repo-name/`.

<img src="https://emilbaehr.com/files/jayson1.png" width="440"> <img src="https://emilbaehr.com/files/slor1.png" width="440">

## Quick Start

### Step 1: Fork this repo.
After forking the repo, your site will be live immediately on your personal Github Pages account, e.g. `https://yourusername.github.io/your-repo-name/`.

*Make sure GitHub Pages is enabled for your repo. It might take some time for the site to propagate entirely.*

### Step 2: Configure your app in `_config.yml`
Unlike the iOS version, **Google Play does not provide an open API for automatic data fetching**. You must enter your app details manually in the `_config.yml` file and commit your changes.

Things you must configure in `_config.yml`:
- **App Name**
- **App Description**
- **Play Store Link**
- **App Icon** (Path to image in `assets/`)
- **App Price**
- **Your Name / Contact Info**

You can also customise:
- Cover Image
- Colors (Background, Text, Overlay)
- Device Color (Black, Blue, White, etc.)
- Social Links
- Feature List (Title, text, icon)

### Step 2.5: Automatic Media Scraper (Recommended) 🪄
Although this template originally required manual entry, **this version includes a powerful script to automate the process.**

Instead of downloading assets manually, you can run:
```bash
npm install
node fetch-app-data.js com.your.package.name
```
**(Replace `com.your.package.name` with your actual app package ID)**

This script will automatically:
*   📥 Download your **App Icon**
*   📸 Download your **Screenshots** (filtering for portrait ones)
*   📝 Update `_config.yml` with your **App Name**, **Description**, **Price**, and **What's New** text.

*Note: By default, it fetches data from the **Mexican Play Store (es_MX)**. You can change this by editing line 37 in `fetch-app-data.js`.*

### Step 3: Add assets (Manual Method)
**If you used the scraper in Step 2.5, skip this step!** Your assets are already ready.

If you prefer to do it manually:

#### App Icon
Upload your high-res app icon to `assets/appicon.png`.

#### Adding a screenshot
Upload a `.png` or `.jpg` of your app to the folder `assets/screenshot/`. The name does not matter. **Ensure there is only one file in this folder.**

#### Adding video
Upload your video to the folder `assets/videos/`. To have support for most browsers, you need to upload two files – one for Safari and one for Chrome/Firefox (.webm, .ogg, .mp4).

#### Resolutions
The videos and screenshots should ideally be vertical (portrait) to fit the phone frame. Recommended resolutions:
- 828x1792
- 1125x2436
- 1242x2688

### Step 4: Edit (or remove) Privacy Policy and Changelog
Your site automatically includes pages for a Privacy Policy and a Changelog. Change the content of these pages by editing the `privacypolicy.md` and `CHANGELOG.md` files in the `_pages` directory.

In each of the markdown files, you can set the `include_in_header:` value to either `true` or `false`. This determines if the page is included in the top navigation.

**Please note:** The Privacy Policy and Changelog provided are written using dummy text, so please adapt each of them for your own app.

## Feedback
If you have feedback regarding bugs or improvements, feel free to open an issue or fork the repo.

## Credits
- [Jekyll](https://github.com/jekyll/jekyll)
- [FontAwesome](https://fontawesome.github.io/Font-Awesome/)

## License
[MIT License](LICENSE)

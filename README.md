# HeadTrack – iPhone symptom diary

HeadTrack is a small, private, mobile-first progressive web app for tracking **headache** and **head dullness** independently. It uses plain HTML, CSS and JavaScript. No framework, database, build command, analytics or sign-in is required.

## What it records

- Date and time of each check-in
- Headache intensity and head dullness intensity (each 0–10, independently)
- Descriptions, locations, associated symptoms and possible contributing factors
- Duration so far (optional), impact on activities, medication/treatment and free-text notes
- Editable history, 30-day statistics and 14-day intensity trends
- Add your own contributing factors as selectable chips, remove them from future choices, and include them in backups
- CSV export, restorable JSON backup upload/import (supports older v1 backups), and deletion

## Easiest iPhone installation: GitHub Pages

1. Unzip this package. Create a **new GitHub repository** (a public repository is simplest for GitHub Free Pages) and upload *the files inside* the `headtrack` folder into the repository root. **Do not upload a file containing your actual symptom logs.**
2. In that repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, choose `main` and `/ (root)`, then **Save**. Wait for GitHub to show the HTTPS Pages address (`https://USERNAME.github.io/REPOSITORY/`).
3. Open that address in **Safari on your iPhone**, then tap the Page Menu / Share button → **Add to Home Screen** → enable **Open as Web App** → **Add**.
4. Launch **HeadTrack** from your Home Screen. Once the app has loaded online at least once and cached its resources, the existing app can work offline.

GitHub Pages hosts *the program files*, not your symptom logs. Your symptom entries are stored in the browser's local storage on your device. Anyone with your GitHub Pages URL can access the **blank app**; they cannot use it to view your local entries. Keep confidential notes out of the repository.

Note: GitHub Pages is HTTPS-hosted static code, **not a completely on-device app distribution mechanism**. Offline use is supported after initial installation/cache. If you require code and data never to be hosted or retrieved online, you would need a different deployment method, e.g. a natively built iOS app.

## Local computer preview

From within this folder on a computer:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` on that same computer. You can test the app and export/import on your computer. To access the server from your iPhone on the same Wi-Fi, use your computer's LAN IP, e.g. `http://192.168.x.x:8000`. **On a plain HTTP LAN URL, iOS generally cannot register the offline service worker**; your computer must stay on, so prefer HTTPS hosting for installable offline use.

## Storage & privacy notes

- Entries are saved with `localStorage` on each specific browser/web-app installation. Safari and Home Screen app storage may not be shared. **Always log through the same installed icon.**
- The application doesn't transmit entries to any server. There is no account, sync or encryption. Someone with access to your unlocked phone might be able to view the diary.
- Removing the Home Screen app, clearing browsing data, or losing/replacing the device can erase entries. **Export a JSON backup regularly and save it somewhere safe** (e.g. Files/iCloud Drive). CSV is for analysis; use JSON to restore. JSON backups now include your custom factor choices as well as check-ins.
- A backup you deliberately share is no longer confined to your phone.
- The app does not diagnose symptoms or replace medical evaluation.

## Add custom factors and upload a backup

- In **Log**, under **Possible contributing factors**, type a new factor (up to 60 characters), then tap **Add factor**. It is saved as a selectable chip and automatically selected for that check-in.
- In **Data → My contributing factors**, you can remove a personal factor from your future choices. Older records mentioning it are preserved.
- In **Data → Export JSON backup**, export the current entries and your custom contributing factors.
- In **Data → Upload / restore a backup**, select the `.json` file from the iPhone Files app. Confirm to merge its entries and any custom factors. Local entries whose IDs match the backup are updated; other local entries are kept.
- Both previous HeadTrack `version: 1` and new `version: 2` JSON backups are supported. **CSV is not a restorable backup.** Backup import is local to the device; no file is uploaded to an external server.
- To keep personal factors and entries when upgrading an existing installation, update the files at the **same GitHub Pages URL** and reload the app. You do not need to uninstall it. Export a backup before updating as a precaution.

## Files

- `index.html`: UI and form
- `app.js`: local storage, edits, chart, export/import
- `styles.css`: mobile styling
- `manifest.webmanifest`: Home Screen web app metadata
- `sw.js`: offline app-shell caching
- `icon.svg`, `icon-192.png`, `icon-512.png`: app icons

## Updating

Replace the app's files in the same repository, preserving the HTTPS URL and origin. Update the cache name in `sw.js` (e.g. `headtrack-v3`) when changing files so the installed app downloads the new version. **Do not remove the Home Screen app to update it** without exporting a backup first.

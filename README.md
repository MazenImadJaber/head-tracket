# HeadTrack v4 – iPhone headache and head dullness diary

A private, offline-friendly progressive web app using plain HTML, CSS and JavaScript. No account, build step or server database is needed. Entries are stored on the device running the app.

## How the unified entries work

**Check-ins and timed headache episodes now use exactly the same symptom form and storage collection.** Every entry can record:

- Headache and head dullness intensity (separate 0–10 scales)
- Date/time, qualities, location, accompanying symptoms and contributing factors
- Impact on activity, medication/treatment and notes
- Duration (manual for a simple check-in; calculated from start and finish for a timed episode)
- A record type (`checkin` or `episode`) and, for timed episodes, an optional check-out timestamp

**Starting an episode:** On the **Log** tab, fill out the symptom form and tap **Check in · Start episode** (either near the top or at the bottom of the form). This creates **one entry**, immediately, containing all those details. The actual time you tap the button is the episode start time. The timer keeps running while the app is closed.

**Ending an episode:** Tap **Check out · End episode**. HeadTrack adds the finish time and calculated duration **to the same entry**; it does not create a second record. You can make additional ordinary check-ins while an episode is active.

**Editing:** In **History**, both timed episodes and simple check-ins appear in one list. Tap **Edit** to modify the same symptoms. For an episode, you can also correct its start and finish times or leave the finish blank while it is still active. Missing scores from old v3 episodes are shown as **— (not recorded)**, not incorrectly turned into zero, unless you actually move a score slider during editing.

**Exports:** The **Data** tab provides a single CSV export for **all** entries, with an entry type and episode start/end timestamps. The JSON backup contains the same unified entries collection and custom factors. Uploading a backup merges records by ID, after a confirmation.

## Updating from v3

1. **Export a JSON backup** from your currently installed HeadTrack v3 **before** updating.
2. Replace the existing files at **the same GitHub Pages address** with the files in this package. Do not uninstall the Home Screen app or change its URL.
3. Reopen or refresh HeadTrack. Existing v3 symptom check-ins and timed episodes are automatically merged into a single entry collection. Old episode start/end times and notes are preserved. Scores that v3 never recorded are kept blank.
4. Review **History**, and create a new backup in the v4 format. If necessary, use **Data → Upload / restore a backup** to import a v3 JSON backup.

Backups from v1, v2, v3 and v4 can be imported. v3 exports had a separate `episodes` array; v4 converts those episodes into regular entries. Import is performed on-device and does not upload the file to a remote server. Repeat imports of an older backup use stable episode IDs so old episodes are not duplicated.

## Installing on iPhone using GitHub Pages

1. Extract the ZIP. In a GitHub repository, place **the files inside** the `headtrack` folder at the repository root.
2. Select **Settings → Pages → Deploy from a branch**, set `main` and `/ (root)`, and save.
3. Open the HTTPS Pages URL on your iPhone in Safari, choose **Add to Home Screen**, and enable **Open as Web App** if shown.
4. Launch from the Home Screen. The app will be offline-capable after its resources have been cached over HTTPS.

For a quick preview on a computer, run `python3 -m http.server 8000` in the `headtrack` folder and visit `http://localhost:8000`.

## Privacy and limitations

- GitHub Pages hosts **only the app files**; it does not receive your symptom records. Your data stays in the browser storage of that specific installation. A public GitHub repository makes the app code public, not your records.
- Browser storage does not synchronise automatically between Safari and an installed Home Screen app. Use the same installation for logging.
- Clearing web app data, uninstalling it or changing phones can erase entries. Save JSON backups regularly to a safe location such as Files/iCloud Drive. CSV is useful for review but is **not** a restorable backup.
- Data in local storage is not end-to-end encrypted by HeadTrack. Anyone able to access your unlocked device could read it. HeadTrack is a diary, not a medical diagnostic tool.
- Automatic tracking captures the start-of-episode symptom snapshot. If your symptoms change during an episode, make additional check-ins or edit the episode's fields later; the app does not independently measure your symptoms.

## Files

- `index.html` – interface
- `app.js` – unified records, migration, editing, chart, import/export
- `styles.css` – mobile styles
- `sw.js` – offline cache (`headtrack-v4`)
- `manifest.webmanifest` and icons – installable Home Screen app

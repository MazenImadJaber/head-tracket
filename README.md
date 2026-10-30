# HeadTrack v5 — private iPhone headache and head dullness tracker

A standalone, offline-capable web app (PWA). Written in HTML, CSS and JavaScript. It stores symptom entries on your device in the **same `headtrack.entries.v1` localStorage collection used by v4**. No account, server database or build tool required.

## What's new in v5

1. **Progress check-ins for timed episodes.** Start an episode using the same form as a check-in. While it is active, every new check-in is automatically linked to that episode (`episodeId`). The episode remains a single entry containing the starting symptom snapshot, start time and check-out time; linked check-ins retain their own full symptom fields. History shows a progression chart and linked timestamps. Editing or deleting an episode does not delete the linked check-in entries (deletion unlinks them).
2. **Symptom calendar.** A monthly view distinguishes a day with headache, a day with dullness but no headache, a day with only explicit 0/0 readings, and an unlogged day. A new quick-action logs **no symptoms right now**, rather than declaring an entire day symptom-free. A day's highest recorded symptoms determine its calendar colour.
3. **Expanded symptoms.** More locations and sensations, plus add/remove custom associated symptoms. Custom symptoms persist in the device and JSON backups. All detailed fields are optional under *More symptom details* for faster logging.
4. **Insights for 7, 30 or 90 days.** Daily peaks (or weekly peaks at 90 days), period comparison, missing-days counts, and cautiously labelled exploratory averages for factors with enough logged comparison days.
5. **30- and 90-day PDF summaries.** Generated entirely in the browser, available from the Data tab. Summaries include documented headache and dullness days, missing days, average intensity, episode counts and durations, a trend chart, common factors/symptoms, episodes and recent check-ins. On an iPhone use the Share sheet to **Save to Files**. PDF reports do not replace restorable JSON backups.
6. **Opt-in in-app reminders.** A daily check-in prompt after a chosen time and an active-episode prompt after 1, 2 or 4 hours. These appear only when the app is open or when you reopen it. **Not background/push alerts**: iOS PWAs cannot reliably schedule background reminders without a push-capable service. All reminders are off by default.

Medication/treatment fields from earlier versions are **retained for backwards compatibility**, but there is no new medication effectiveness analysis.

## Install or update (GitHub Pages)

1. **From your existing v4 app, export a JSON backup first** using Data → Export JSON backup.
2. Extract the ZIP. Upload the **contents** of the `headtrack` folder to the root of your existing GitHub repository, overwriting the old files. Keep the **same GitHub Pages address** and do not uninstall your iPhone Home Screen app.
3. On iPhone open the installed app again after publishing. If an older version is still visible, close it fully and reopen it while connected to the internet; its service-worker cache is versioned `headtrack-v5`.
4. Check History. All prior entries and episodes should remain. Create a new v5 JSON backup.

For new installs, Settings → Pages → Deploy from `main` at `/ (root)`, then open the repository's GitHub Pages HTTPS URL in Safari → Share → Add to Home Screen.

For local preview on a desktop, run `python3 -m http.server 8000` inside `headtrack` and open `http://localhost:8000`. Keep `report.js` alongside `app.js`.

## Backups and compatibility

- JSON backups include **unified entries**, custom contributing factors and custom symptoms. Old v1–v4 backups can still be imported, including migration of separate v3 episode records.
- Imports merge by entry ID with confirmation; identical IDs in a backup replace the stored version. Existing device entries otherwise remain.
- `episodeId` is optional on regular check-ins, so imported v4 entries work unchanged. Legacy episodes have no retroactively fabricated progress data.
- CSV exports include the `episodeId` linkage column. Use JSON for recovery, not CSV or PDF.
- Reminder preferences are device-specific and **not** included in a backup.

## Privacy, limitations and medical guidance

- Github Pages hosts app code only; symptom information remains in this specific app installation on-device. The installed Home Screen app and Safari can have separate storage.
- Clearing website data, uninstalling the PWA or changing devices can erase data. Export JSON routinely to a protected location.
- No automatic background sync. Data in local storage is not encrypted by this app.
- The report is descriptive, not diagnostic. Associations between potential factors and symptoms are **not causal evidence**; missing check-ins are not normal/zero scores.
- If a headache is sudden and unusually severe, or accompanied by new neurological symptoms, get urgent medical assessment rather than relying on the diary.

## Files

`index.html` (interface), `styles.css` (mobile design), `app.js` (diary data, insights, migration and reminders), `report.js` (offline PDF generator), `sw.js` (versioned offline service worker), manifest and icons.

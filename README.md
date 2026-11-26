# HeadTrack v6 — migraine-focused diary for iPhone

A standalone, offline-capable progressive web app for recording headaches and possible factors in the **24 hours before a headache**. Based on the *Migraine & Headache Australia* guidance below; it is **not** an official app or a diagnostic test. Your doctor will need the attack history, symptom features and their clinical assessment to confirm or reject migraine.

## New in v6

- **I had a headache** starts a new log and prompts you to adjust headache intensity to 1–10.
- **Headache features:** one-sided/both, pulsating, aggravated by activity, nausea, sensitivity to light/sound, possible aura. These relate to diagnostic review and are distinct from exposures.
- **Previous 24 hours:** 16 common exposure prompts in five groups; each has **Yes / No / Unsure / left unanswered**. Records what happened in the 24h before onset, not a causal claim. You can add custom prompts (e.g. shift work).
- **No headache today:** opens the same form at pain intensity 0 so you can record exposures on control days. This helps put reported factors into context.
- **Clinician review:** reports show symptom features and factors on headache versus explicitly no-headache entries. Summaries only count Yes/No answers as known; don't treat uncertainty or missing answers as absence.
- **Compatible:** v1–v5 JSON backups import; existing v5 entries and episodes remain in the same `headtrack.entries.v1` storage collection. Old unstructured factor selections are not retrospectively labelled as 24-hour exposures. JSON exports are **v6**; CSV adds 24-hour answers and headache features. Existing check-ins, episodes, calendar, PDFs and in-app reminders are kept.

## Install / update using GitHub Pages

1. In existing HeadTrack, use **Data → Export JSON backup** and save it to Files or iCloud Drive.
2. Unzip v6. Copy the **contents of the `headtrack/` folder** into the root of your existing GitHub Pages repository, replacing old files.
3. Keep the exact same site address and installed iPhone Home Screen app. Reopen it while online to update the versioned offline cache (`headtrack-v6`).
4. Confirm that older entries are visible in History, then export a fresh v6 backup.

For first installation, put the files in a GitHub repository, enable **Settings → Pages → Deploy from branch** (`main`, `/root`), then open the HTTPS Pages address in **Safari → Share → Add to Home Screen**.

For a desktop test, run `python3 -m http.server 8000` inside the `headtrack/` folder, then open `http://localhost:8000`.

## Using it for a diagnosis review

- Log when the headache begins, its severity and **headache features**; use a timed episode if useful. For any later observations, progress check-ins can be linked to the episode.
- Look back to the **24h before onset**, not after pain began. If you do not remember a factor, choose Unsure or leave it unanswered. Recording a headache isn't an obligation to tick every item.
- On some days **without headache**, use the No headache today workflow and answer the same 24h questions. Otherwise a frequent everyday exposure can wrongly appear to be a trigger.
- Show your doctor a 30/90-day PDF from the Data tab, or a CSV for a more detailed review.
- A factor occurring before a headache is not enough to confirm migraine. Sleep changes, cravings, thirst and neck discomfort may sometimes be early migraine symptoms rather than triggers. No combination of items in this app diagnoses migraine.

## Technical and privacy notes

- No server or account; personal entries are stored in this app's iPhone browser storage (unencrypted localStorage). GitHub Pages serves only the app code.
- No automatic sync. Removing the app or clearing site data may erase entries. Regularly export JSON backup.
- Imports merge by ID, replacing records with matching IDs after user confirmation. Never restore from an untrusted JSON file.
- Old v5 factors remain in `entry.trigger`; new 24h responses live in `entry.pre24`, and clinical features in `entry.migraine`. Old records are not assigned fabricated "No" answers.
- Timed episodes, symptom calendar and reminder settings are retained. Reminders only show while the app is open/reopened; they are not background iOS notifications.
- If headache is sudden and extremely severe or associated with new neurological symptoms, seek urgent medical attention instead of relying on the diary.

## Guidance consulted

- <https://www.migraine.org.au/triggers>
- <https://www.migraine.org.au/understanding_migraine_triggers>
- <https://www.migraine.org.au/headaches_are_migraine>
- <https://www.migraine.org.au/diaries>

Migraine Australia states that trigger tracking is individual and can be burdensome long-term. You might track for a clinician-agreed period and then review whether continued daily tracking is useful.

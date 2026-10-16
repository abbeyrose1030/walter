# WALTER

Bright, simple practice app for Ava: play backing tracks, record front-camera video with **mic audio** (guitar), and upload for her teacher to review.

## Stack

- [Next.js](https://nextjs.org) on [Vercel](https://vercel.com)
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for songs and videos
- PWA-friendly (Add to Home Screen on iPad)

## Setup

1. Push this folder to **GitHub**.
2. Import the repo in **Vercel**.
3. Add a **Blob** store to the project (Vercel will set `BLOB_READ_WRITE_TOKEN`).
4. Deploy.

## Local dev

```bash
npm install
cp .env.example .env.local
# fill in BLOB_READ_WRITE_TOKEN if testing uploads locally
npm run dev
```

- Ava: [http://localhost:3000](http://localhost:3000)
- Abbey: [http://localhost:3000/teacher](http://localhost:3000/teacher)

## iPad (Ava)

1. Open the deployed site in **Safari**.
2. **Share → Add to Home Screen** (“WALTER”).
3. Open WALTER from the home screen (standalone mode helps camera + audio).
4. Allow **Camera** and **Microphone** when prompted.

### Audio notes

- Backing tracks play through the **Web Audio API** so iOS is less likely to **duck** music when recording starts.
- The **recording** uses the **microphone only** (not speaker output), so uploads emphasize her guitar.
- If music still gets quiet, use decent iPad volume and practice in standalone (home screen) mode.

## Teacher workflow

1. Go to **Teacher** tab and enter the password from `lib/auth.ts` (`DEFAULT_TEACHER_PASSWORD`).
2. Upload MP3/M4A practice tracks.
3. Review uploaded practice videos on the same page.

## Copy this app for another student

Each student should get their **own folder**, **GitHub repo**, **Vercel project**, and **Blob store** (so songs and videos stay separate).

1. Duplicate the project folder on your Desktop (do not copy `node_modules` or `.next`):

   ```bash
   rsync -a --exclude node_modules --exclude .next --exclude .git \
     "/Users/administrator/Desktop/AVA APP/" \
     "/Users/administrator/Desktop/NEW STUDENT APP/"
   ```

2. In the new folder, edit **`lib/branding.ts`**:
   - `STUDENT_NAME` — greeting & uploads
   - `APP_NAME` — home screen title (e.g. another silly name)
   - `INSTRUCTOR_NAME` — your tab label (usually still Abbey)

3. Optionally change **`lib/auth.ts`** → `DEFAULT_TEACHER_PASSWORD` if you want a different Abbey-tab password per student.

4. In the new folder: `git init`, new GitHub repo, push, import to Vercel, add **Blob**, deploy.

5. Upload that student’s tracks from the **Abbey** tab. Ava’s app is unchanged.

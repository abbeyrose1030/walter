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
4. (Optional) Set **`TEACHER_PASSWORD`** in Vercel to change the teacher login. If you skip this, use the default password in the README below.
5. Deploy.

## Local dev

```bash
npm install
cp .env.example .env.local
# fill in BLOB_READ_WRITE_TOKEN and TEACHER_PASSWORD
npm run dev
```

- Ava: [http://localhost:3000](http://localhost:3000)
- Teacher: [http://localhost:3000/teacher](http://localhost:3000/teacher)

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

1. Go to `/teacher` and enter the teacher password (**default:** set in `lib/auth.ts`; override with `TEACHER_PASSWORD` in Vercel).
2. Upload MP3/M4A practice tracks.
3. Review uploaded practice videos on the same page.

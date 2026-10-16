# WALTER

Bright, simple practice app for Ava: watch Abbey’s **reference video** for a riff, record herself on the front camera with **mic audio**, and upload for review.

## Stack

- [Next.js](https://nextjs.org) on [Vercel](https://vercel.com)
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for reference videos and practice uploads
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
3. Open WALTER from the home screen.
4. Pick a riff, watch the reference video, allow **Camera** and **Microphone**, then record.

## Teacher workflow

1. Go to **Teacher** tab and enter the password from `lib/auth.ts` (`DEFAULT_TEACHER_PASSWORD`).
2. Upload a **reference video** of you playing each assigned riff.
3. Review Ava’s uploaded practice videos on the same page.

## Copy this app for another student

See project notes / duplicate the folder, edit `lib/branding.ts`, new GitHub repo + Vercel + Blob store.

# Shared card page

What someone sees when they tap a shared Daily Few card link (`https://app.dailyfew.com/c/<id>`)
without the app installed: the question, and a prompt to get the app. With the app installed,
iOS opens the app instead (universal link, via `.well-known/apple-app-site-association`).

- `api/c.js` renders the page on the server so text-message previews show the question.
- Deployed on Vercel from this folder. Set `APP_STORE_URL` once the app is live.

# Quietly Curious

A small, MongoDB-backed Node.js blog. It has a public reading experience and a private-in-practice publisher screen at `/admin/post`.

## Run it

```bash
npm start
```

Set the MongoDB connection string before starting the app:

```bash
export MONGODB_URI='mongodb+srv://Bot:<db_password>@cluster0.9fprj5d.mongodb.net/?appName=Cluster0'
export MONGODB_DB='quietly-curious'
npm start
```

Replace `<db_password>` with the database user password in your environment. Do not commit the connection string. Open `http://localhost:3000`; use `http://localhost:3000/admin/post` to paste JSON directly.

## Post format

The publisher accepts one object, an array of objects, or an object with a `posts` array. The simplest format is:

```json
{
  "title": "How to get rich in attention",
  "excerpt": "A short introduction shown on the homepage.",
  "body": "## Wake up early\n\nYour story in markdown-like text.",
  "category": "Ideas",
  "date": "2026-09-28"
}
```

Your original format also works:

```json
{
  "main header": "How to get rich",
  "header1": "Wake up early",
  "body1": "Waking up early is good...",
  "header2": "Protect your focus",
  "body2": "A second section..."
}
```

Posts are stored in the MongoDB `posts` collection. The app creates a unique index for each post slug on startup. Existing JSON files are no longer read or written by the application.

## A-ADS

The homepage includes a clearly marked ad placement in `public/index.html`. After A-ADS verifies the site and gives you the ad code, paste that code inside the `ad-slot` element. The placement is isolated so it can be replaced without changing the rest of the site.

## Deploy on Render

1. Push this project to a GitHub repository.
2. In Render, choose **New +** and then **Blueprint**.
3. Select the repository. Render will read `render.yaml` and create the web service.
4. In the service environment settings, set `MONGODB_URI` to the MongoDB Atlas connection string. Keep the password URL-encoded if it contains special characters.
5. Deploy it and open the generated `onrender.com` URL.

The site uses `PORT` automatically and listens on Render's public interface. MongoDB keeps published posts independent of Render deploys and filesystem resets.
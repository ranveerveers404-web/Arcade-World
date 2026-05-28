# Arc World

Arc World is a retro-inspired static arcade site with five browser games:

- Pong Duel
- Neon Racer
- Star Hunter
- Brick Smash
- Maze Run

## Features

- Fullscreen play for every cabinet
- Keyboard and touch controls
- Featured game cards and neon arcade landing page
- Separate movies and TV watch section with official OTT links
- Leaderboard UI with two modes:
  - Local demo mode with `localStorage`
  - Public shared mode using Supabase REST

## Local preview

Open `index.html` directly in a browser, or run a local static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

This project can be published from the `main` branch with GitHub Pages.

1. Push the files to GitHub.
2. In the repository, open `Settings > Pages`.
3. Set `Source` to `Deploy from a branch`.
4. Set `Branch` to `main` and folder to `/ (root)`.
5. Save and wait for the site to publish.

## Public leaderboard setup

By default, scores are only stored in the current browser.

To make the leaderboard public for everyone, connect a Supabase project and create a table named `scores`.

Suggested schema:

```sql
create table public.scores (
  id bigint generated always as identity primary key,
  player text not null,
  game text not null,
  score integer not null,
  created_at timestamptz not null default now()
);
```

Allow reads and inserts for the public key you use on the site.

Then add this before `script.js` in `index.html`:

```html
<script>
  window.ARC_WORLD_LEADERBOARD = {
    projectUrl: "https://YOUR-PROJECT.supabase.co",
    publishableKey: "YOUR_SUPABASE_ANON_KEY"
  };
</script>
```

After that, refresh the page and the leaderboard will switch from local demo mode to public live mode.

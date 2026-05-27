# Arc World

Retro mini-games in a lightweight static website.

## Included games

- Pong Duel
- Night Rider
- Star Blaster

## Local preview

Open `index.html` directly in a browser, or run a small static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Public hosting with GitHub Pages

This project includes a GitHub Pages workflow at `.github/workflows/deploy.yml`.

1. Create a new GitHub repository.
2. Upload these files to the repository root.
3. Push to the `main` branch.
4. In GitHub, open `Settings > Pages` and make sure `GitHub Actions` is the source.
5. After the workflow finishes, your public site will be available at:

```text
https://<your-github-username>.github.io/<repo-name>/
```

## Controls

- Pong: `W` / `S` or touch buttons
- Racing: arrow keys or touch buttons
- Shooter: arrow keys + space or touch buttons

# bethesdajex.org

Plain static site. No build step: edit the files and push.

- `index.html` has all the text. Each piece of text appears twice, once with `lang="en"` and once with `lang="ja"`. The EN / 日本語 toggle shows one or the other.
- `script.js` builds the list of meeting dates (3rd Wednesday of each month). To cancel a date, add it to `CANCELLED` at the top of the file. It will show crossed out.
- `events.ics` is the "Add to your calendar" file. It repeats every month on its own.
- `images/` has placeholder pictures. To replace them, drop in `hero.jpg` / `intro.jpg` and change the `src` in `index.html`.

## Preview locally

    python3 -m http.server 8000

Then open http://localhost:8000

## Deploy (GitHub Pages + Squarespace Domains)

1. Push this folder to a GitHub repo.
2. Repo → Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
3. Custom domain: `bethesdajex.org` (the `CNAME` file already says this). Tick "Enforce HTTPS" once it's available (can take up to a day).
4. In Squarespace Domains → bethesdajex.org → DNS, add:

   | Type  | Host | Value                    |
   |-------|------|--------------------------|
   | A     | @    | 185.199.108.153          |
   | A     | @    | 185.199.109.153          |
   | A     | @    | 185.199.110.153          |
   | A     | @    | 185.199.111.153          |
   | CNAME | www  | YOUR-GITHUB-USERNAME.github.io |

   Remove any default Squarespace A/CNAME records for `@` and `www` that conflict.

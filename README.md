# Yurielle Jua Park — Portfolio

A static portfolio site. Plain HTML, CSS and vanilla JavaScript — no build step,
no framework, no dependencies. Open `index.html` in a browser and it runs.

## Files

```
index.html          the one-page portfolio
reader.html         the A Quiet Pencil flipbook
css/style.css       the whole stylesheet (one file, numbered sections)
js/main.js          loader, menu, scroll reveals, parallax, starfield, cursor
js/book.js          the flipbook
js/book-data.js     generated list of the 65 book pages (day number + title)
assets/book/pages   full-size page images (65)
assets/book/thumbs  thumbnails for the page index (65)
assets/photos       activity and award photographs
assets/video        two compressed performance videos with poster frames
```

## Deploying to GitHub Pages

1. Create a GitHub account, then a repository named `<username>.github.io`.
2. Upload **the contents of this `site` folder** to the repository root —
   `index.html` must sit at the top level, not inside a `site/` folder.
3. Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
4. The site appears at `https://<username>.github.io` after a minute or two.

Total size is about 53 MB, which is well inside the GitHub Pages limits.

## Editing

Everything a student would normally want to change is plain text:

- **Wording** — edit `index.html` directly.
- **Colours** — the palette is at the top of `css/style.css` under `:root`.
  `--violet`, `--blue` and `--gold` drive most of the page.
- **Adding a book page** — drop the image into `assets/book/pages/`, a
  thumbnail of the same name into `assets/book/thumbs/`, and add an entry to
  `js/book-data.js`. Page images should be 928×1200.
- **Section order** — each section in `index.html` is a `<section class="sec">`
  with an `id`. Move the block and update the matching link in the `.menu` list.

## The flipbook

`reader.html` picks its own layout from the width of the window:

- **860 px and wider** — a real two-page book. Each leaf carries one page on the
  front and the next on the back, and rotates around its left edge.
- **Narrower** — one page at a time, turned with a single animated sheet.

Controls: click the left or right half of the page, the arrow buttons, the
`←` / `→` keys, `Home` / `End`, swipe on a touchscreen, the progress bar, or the
grid button for the full page index. `reader.html#day12` opens on a given day.

Page images are only loaded within six pages of wherever the reader is, so
opening the book does not download all 65 pages at once.

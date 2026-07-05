# Siesha Image Assets – GitHub Pages

This folder (`docs/`) is the publishing source for GitHub Pages in the **siesha-app** repository.  
It is intended for hosting static image files that can be referenced by URL anywhere on the web.

---

## Live URL

Once GitHub Pages is enabled, this site is published at:

```
https://ashusharma1958.github.io/siesha-app/
```

Images inside `docs/images/` are then accessible at:

```
https://ashusharma1958.github.io/siesha-app/images/<filename>
```

**Example:**

```
https://ashusharma1958.github.io/siesha-app/images/logo.png
```

---

## How to add images

1. Place your image file(s) inside the `docs/images/` folder:
   ```
   docs/images/logo.png
   docs/images/banner.jpg
   ```

2. Commit and push to the `main` branch:
   ```bash
   git add docs/images/logo.png
   git commit -m "add logo image"
   git push origin main
   ```

3. After the push, the image is publicly accessible within a minute or two at:
   ```
   https://ashusharma1958.github.io/siesha-app/images/logo.png
   ```

---

## How to enable GitHub Pages

1. Go to **Settings → Pages** in this repository.
2. Under **Build and deployment**, set:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main`
   - **Folder**: `/docs`
3. Click **Save**.

GitHub Pages will publish the `docs/` folder automatically on every push to `main`.

---

## Folder structure

```
docs/
├── index.html        ← entry page (required by GitHub Pages)
├── README.md         ← this file
└── images/           ← put your image files here
    └── .gitkeep      ← placeholder so the folder is tracked by git
```

---

## Notes

- GitHub Pages serves **static files only** — no server-side processing.
- Images are **publicly accessible** — do not upload private or sensitive images.
- Supported formats: `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, etc.
- Large files (>100 MB) are not supported; use [Git LFS](https://git-lfs.github.com/) for very large assets.

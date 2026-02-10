# CLAUDE.md — KnowPG / Popcast

## Project Overview

**knowpg.com** is the official website for **Popcast**, a music and pop culture podcast show. The site is built on a **Squarespace "Wright" template** and managed via Squarespace's developer platform with Git integration.

### Social Media Presence
- **TikTok**: [@popcast](https://www.tiktok.com/@popcast)
- **Instagram**: [@popcast](https://www.instagram.com/@popcast)
- **YouTube**: [@popcast](https://www.youtube.com/@popcast)

---

## Repository Structure

```
knowpg.com/
├── CLAUDE.md                  # This file — AI assistant guide
├── blocks/                    # 14 reusable Squarespace template blocks
│   ├── footer.block           # Footer layout with nav, social, copyright
│   ├── header-nav.block       # Primary/secondary navigation
│   ├── mobile-nav.block       # Mobile hamburger navigation
│   ├── cart.block             # E-commerce cart
│   ├── intro.block            # Page intro/hero sections
│   ├── social-links.block     # Social media icon links
│   ├── sqs-image.block        # Responsive image component (complex)
│   ├── sqs-video-background.block  # Video background support
│   └── ...                    # Other UI component blocks
├── collections/               # Content type configurations
│   ├── blog.conf              # Blog (chronological, 20/page)
│   ├── album.conf             # Audio album collections
│   ├── events.conf            # Calendar events
│   ├── products.conf          # E-commerce products (v2.0)
│   ├── page.conf              # Standard pages (video bg support)
│   ├── index.conf             # Stacked index layout
│   └── folders.conf           # Navigation folders
├── scripts/
│   └── site-bundle.js         # 146KB minified JS bundle (Webpack)
├── styles/                    # 13 LESS/CSS stylesheets (~302KB)
│   ├── tweak.less             # 120KB — all Squarespace design tweaks
│   ├── header.less            # Header styles
│   ├── footer.less            # Footer styles
│   ├── index.less             # Index/landing page styles
│   ├── mobile-styles.less     # Responsive mobile styles
│   ├── site.less              # Core site styles
│   └── ...                    # Other component styles
├── code-injection/            # Custom code for Squarespace injection
│   ├── header.html            # Goes in Settings > Advanced > Header
│   └── footer.html            # Goes in Settings > Advanced > Footer
├── popcast-viral-clipper/     # Viral clip identifier tool (Adobe Premiere Pro extension)
├── site.region                # Main HTML template (JSON-T)
└── template.conf              # Template config (Wright template)
```

## Tech Stack

| Component       | Technology                     |
|-----------------|--------------------------------|
| Platform        | Squarespace (hosted)           |
| Template        | Wright by Squarespace, Inc.    |
| Template Lang   | JSON-T (Squarespace proprietary) |
| Styling         | LESS CSS preprocessor          |
| JavaScript      | ES5/6, Webpack bundled         |
| Collections     | Blog, Album, Events, Products, Pages, Index |

## Development Workflow

### Squarespace Git Integration
This repo syncs with Squarespace via their Git deployment system:
- **Push to main** → auto-deploys to live site
- **Template files** (`.block`, `.region`, `.conf`) use Squarespace JSON-T syntax
- **Styles** are LESS files compiled by Squarespace at build time
- **Scripts** are served via `<squarespace:script>` tags

### Code Injection
Custom code is injected via Squarespace's Settings > Advanced > Code Injection:
- **Header injection** → inserted inside `<head>` via `{squarespace-headers}`
- **Footer injection** → inserted before `</body>` via `{squarespace-footers}`
- Reference files in `code-injection/` directory

### Key Template Variables
- `{squarespace-headers}` — injects head content + code injection
- `{squarespace-footers}` — injects footer scripts + code injection
- `{squarespace.main-content}` — page content area
- `{collection.typeName}` — current collection type
- `{website.logoImageUrl}` — site logo
- `{website.siteTagLine}` — site tagline

## Conventions for AI Assistants

1. **Never modify `site-bundle.js`** — it's a minified Webpack bundle
2. **LESS files** use Squarespace tweak variables (e.g., `@tweak-header-...`)
3. **Block files** use JSON-T syntax, not standard HTML templating
4. **Custom code** goes in `code-injection/` directory, NOT in template files
5. **Collection configs** define content types — modify carefully as they affect CMS
6. **Test changes** via Squarespace's local development server before pushing
7. **The `popcast-viral-clipper/`** directory is a separate Node.js/Python project for the Premiere Pro viral clip tool — it does NOT deploy to Squarespace

## Popcast Viral Clipper Tool

The `popcast-viral-clipper/` directory contains an Adobe Premiere Pro extension that:
- Analyzes podcast episode transcripts using AI
- Identifies segments with high viral potential
- Scores clips based on patterns learned from TikTok/Instagram/YouTube performance
- Integrates directly into Premiere Pro's panel system via CEP/UXP

See `popcast-viral-clipper/README.md` for setup and development instructions.

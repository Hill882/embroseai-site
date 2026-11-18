# embroseai.com

Site for Embrose AI, built as a static site.

- Edit copy in `src/`, settings in `config.json`, automation-map entries in `data/automations.json`.
- Build: `npm run build` renders templates into `site/` and bundles JavaScript. The deployable folder includes `CNAME` and `.nojekyll`.
- Deploy: `.github/workflows/pages.yml` builds and publishes `site/` to GitHub Pages on push to `main`.

Contact switches in `config.json`:
- `SHOW_EMAIL`: shows `EMAIL` as a secondary contact on the page and in the structured data.
- `BOOKING_URL`: set to a booking-page URL to add "Book a free intro call" buttons; leave empty to hide them.
- `SHOW_FOUNDING_OFFER`: shows the founding-client line in the Embrose Crew section.
- `FORM_ENDPOINT`: FormSubmit.co destination for the contact form. Set to `hello@embroseai.com` now. After the first submission, FormSubmit emails a confirmation link; you can then replace this with the random alias they give you. Leave empty to hide the form. The no-JS post goes to `https://formsubmit.co/{FORM_ENDPOINT}`; the JavaScript path uses `https://formsubmit.co/ajax/{FORM_ENDPOINT}`. A full FormSubmit URL also works.

Three.js is loaded only after first paint, and only when the visitor is on a wide screen, has WebGL, and has not asked for reduced motion. On smaller screens a lightweight 2D canvas stage is used instead; the GSAP/Lenis bundle is not downloaded there. Visitors who prefer reduced motion get a static page with the same content.

Inner pages (draft batch, branch `geo-pages-draft`):
- Copy lives in `content/pages/*.md` (one file per page), `content/faq.md` and `content/llms.txt`. `pages.py` (run by `build.py`) renders them into `templates/page.html` and writes `site/<slug>/index.html`, `site/faq/index.html` and `site/llms.txt`. Inner pages are static HTML and CSS with no JavaScript.
- Editor's notes in the copy are not published: italic notes in parentheses such as `*(Collin: ...)*`, anything after a second `---` line, and a FAQ whose answer is only a note.
- The /faq/ page reuses the home page's 9 FAQs from the rendered home page, so the text always matches.
- JSON-LD per page follows the SEO schema notes (Service / WebPage, BreadcrumbList, FAQPage built from the same text shown on the page).
- `npm run build:preview` also writes `preview/`: relative links and assets plus `noindex,nofollow`, for review from a static host such as raw.githack.com. `preview/` is never deployed (Pages deploys `site/` from `main`).

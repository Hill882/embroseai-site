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

Legal pages: `content/legal/privacy.md` and `terms.md` are rendered by `pages.py` into `templates/page.html` as /privacy/ and /terms/. `LEGAL_NAME` sets the footer copyright and the home schema `legalName`; set `LEGAL_UPDATED` to the go-live date before publishing. `npm run build:preview` also writes a noindex `preview/` copy for review (never deployed).

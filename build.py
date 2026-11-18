#!/usr/bin/env python3
"""Build the static site: render src/ templates into site/, then Vite adds JS."""
import html, json, re, pathlib, shutil

root = pathlib.Path(__file__).parent
c = json.loads((root / 'config.json').read_text())

auto = json.loads((root / 'data' / 'automations.json').read_text())
esc = lambda s: html.escape(s, quote=True)
parts = []
for key, ind in auto.items():
    rows = ''.join(f'<li><strong>{esc(t["job"])}</strong>: {esc(t["does"])}</li>' for t in ind['tasks'])
    parts.append(f'<details><summary>{esc(ind["name"])}</summary><ul>{rows}</ul></details>')
c['STATIC_MAP'] = '<h3 class="nojs-h">Common starting points</h3>' + ''.join(parts)
c['AUTO_JSON'] = json.dumps(auto, separators=(',', ':')).replace('</', '<\\/')


def form_urls(endpoint):
    ep = str(endpoint or '').strip()
    if not ep:
        return '', ''
    if re.match(r'https?://', ep):
        action = ep
        if '/ajax/' in action:
            return action, action
        return action, action.replace('://formsubmit.co/', '://formsubmit.co/ajax/', 1)
    return f'https://formsubmit.co/{ep}', f'https://formsubmit.co/ajax/{ep}'

c['FORM_ACTION'], c['FORM_AJAX'] = form_urls(c.get('FORM_ENDPOINT'))

LOGO = ('<a class="logo" href="/" aria-label="{{BUSINESS_NAME}} home"><svg aria-hidden="true" viewBox="0 0 32 32" width="28" height="28">'
        '<rect width="32" height="32" rx="8" fill="#0b5fff"/><path d="M10 9h12v3h-8.5v2.5H21v3h-7.5V20H22v3H10z" fill="#fff"/>'
        '<circle cx="25" cy="22" r="2.2" fill="#ffb347"/></svg><span>Embrose<b> AI</b></span></a>')
c['SITE_HEADER'] = ('<header class="top"><div class="wrap bar">' + LOGO +
    '<nav aria-label="Main"><a href="/ai-audit/">AI Audit</a><a href="/ai-crew/">The Crew</a>'
    '<a href="/private-local-ai/">Private AI</a><a href="/pricing/">Pricing</a>'
    '<a href="/areas-served/">Areas</a><a href="/faq/">FAQ</a></nav>'
    '<a class="btn btn-ghost btn-sm hide-md" href="tel:{{PHONE_TEL}}">{{PHONE}}</a>'
    '<a class="btn btn-sm" href="{{BOOKING_URL}}" rel="noopener">Book<span class="hide-sm"> a free</span> intro call</a>'
    '</div></header>')
c['SITE_FOOTER'] = ('<footer class="foot"><div class="wrap">'
    '<div class="foot-nav">'
    '<div><p class="foot-h">Services</p><ul><li><a href="/ai-audit/">AI Audit</a></li><li><a href="/ai-crew/">The Crew: AI bots for back-office work</a></li>'
    '<li><a href="/private-local-ai/">Private local AI</a></li><li><a href="/pricing/">Pricing</a></li></ul></div>'
    '<div><p class="foot-h">Industries</p><ul><li><a href="/industries/real-estate-teams/">AI for real estate teams</a></li>'
    '<li><a href="/industries/field-and-home-services/">AI for field and home-services companies</a></li></ul></div>'
    '<div><p class="foot-h">Embrose AI</p><ul><li><a href="/">Home</a></li><li><a href="/areas-served/">Areas served</a></li>'
    '<li><a href="/faq/">FAQ</a></li><li><a href="{{BOOKING_URL}}" rel="noopener">Book a free 30-minute intro call</a></li></ul></div>'
    '</div>'
    '<p><strong>{{BUSINESS_NAME}}</strong> · Franklin, Indiana · <a href="tel:{{PHONE_TEL}}">{{PHONE}}</a><!--IF:SHOW_EMAIL--> · <a href="mailto:{{EMAIL}}">{{EMAIL}}</a><!--ENDIF:SHOW_EMAIL--></p>'
    '<p class="fine">© 2026 {{BUSINESS_NAME}}</p>'
    '</div></footer>')


def render(t):
    t = re.sub(r'<!--IF:(\w+)-->(.*?)<!--ENDIF:\1-->',
               lambda m: m.group(2) if c.get(m.group(1)) else '', t, flags=re.S)
    t = re.sub(r'/\*IF:(\w+)\*/(.*?)/\*ENDIF:\1\*/',
               lambda m: m.group(2) if c.get(m.group(1)) else '', t, flags=re.S)
    for _ in range(2):
        for k, v in c.items():
            t = t.replace('{{' + k + '}}', str(v))
        t = re.sub(r'<!--IF:(\w+)-->(.*?)<!--ENDIF:\1-->',
                   lambda m: m.group(2) if c.get(m.group(1)) else '', t, flags=re.S)
    left = re.findall(r'\{\{\w+\}\}', t)
    if left:
        raise SystemExit(f'unfilled keys: {sorted(set(left))}')
    return t

out = root / 'site'
if out.exists():
    for old in out.iterdir():
        if old.name == 'assets':
            continue  # leave Vite output if present; vite/build order handles this
        shutil.rmtree(old) if old.is_dir() else old.unlink()
else:
    out.mkdir()

src = root / 'src'
# fonts
fonts = out / 'fonts'
fonts.mkdir(exist_ok=True)
for f in (src / 'fonts').iterdir():
    shutil.copy(f, fonts / f.name)

for f in src.iterdir():
    if f.is_dir():
        continue
    if f.suffix in ('.html', '.css', '.svg', '.xml', '.txt', '.webmanifest'):
        (out / f.name).write_text(render(f.read_text()))
    else:
        shutil.copy(f, out / f.name)

import pages
for path, title, desc in pages.build(out, c, render):
    print(f'{path}: title {len(title)} chars, description {len(desc)} chars')

(out / '.nojekyll').write_text('')
(out / 'CNAME').write_text(c['DOMAIN'].split('//')[1] + '\n')
print('rendered ->', out)

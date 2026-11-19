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

import pages
c['SITE_HEADER'], c['SITE_FOOTER'] = pages.site_chrome(c)
if not str(c.get('LEGAL_UPDATED', '')).strip() or '[' in str(c.get('LEGAL_UPDATED', '')):
    print('NOTE: LEGAL_UPDATED in config.json is a placeholder; set it to the go-live date before publishing.')


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

for path, title, desc in pages.build(out, c, render):
    print(f'{path}: title {len(title)} chars, description {len(desc)} chars')

(out / '.nojekyll').write_text('')
(out / 'CNAME').write_text(c['DOMAIN'].split('//')[1] + '\n')
print('rendered ->', out)

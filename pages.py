#!/usr/bin/env python3
"""Inner pages for embroseai.com.

Renders content/pages/*.md and content/faq.md into templates/page.html and
writes site/<slug>/index.html. Also writes site/llms.txt from content/llms.txt.
Static HTML only: no JavaScript on inner pages.

Markdown rules (small, purpose-built parser):
- The first lines carry **Title tag:**, **Meta description:**, **H1:**, **Breadcrumb:**.
- Body starts after the first '---' line; anything after a later '---' line is an
  editor's note and is not published.
- Italic notes in parentheses, e.g. *(Collin: ...)*, are editor's notes and are dropped.
- A FAQ answer that is only an editor's note is dropped with its question.
"""
import html, json, re, pathlib

ROOT = pathlib.Path(__file__).parent
esc = lambda s: html.escape(s, quote=True)

PAGES = {
    'ai-audit': '/ai-audit/',
    'ai-crew': '/ai-crew/',
    'private-local-ai': '/private-local-ai/',
    'pricing': '/pricing/',
    'real-estate-teams': '/industries/real-estate-teams/',
    'field-and-home-services': '/industries/field-and-home-services/',
    'areas-served': '/areas-served/',
}
ALL_PATHS = list(PAGES.values()) + ['/faq/', '/privacy/', '/terms/']

AREA = [
    {"@type": "City", "name": "Franklin, Indiana"},
    {"@type": "City", "name": "Greenwood, Indiana"},
    {"@type": "City", "name": "Indianapolis, Indiana"},
    {"@type": "AdministrativeArea", "name": "Johnson County, Indiana"},
]

LEGAL = {'privacy': '/privacy/', 'terms': '/terms/'}

LOGO = ('<a class="logo" href="/" aria-label="{{BUSINESS_NAME}} home"><svg aria-hidden="true" viewBox="0 0 32 32" width="28" height="28">'
        '<rect width="32" height="32" rx="8" fill="#0b5fff"/><path d="M10 9h12v3h-8.5v2.5H21v3h-7.5V20H22v3H10z" fill="#fff"/>'
        '<circle cx="25" cy="22" r="2.2" fill="#ffb347"/></svg><span>Embrose<b> AI</b></span></a>')


def has_page(slug):
    return (ROOT / 'content' / 'pages' / f'{slug}.md').exists()


def has_faq():
    return (ROOT / 'content' / 'faq.md').exists()


def site_chrome(c):
    """Shared header (inner pages) and footer (every page). Only links to pages that exist."""
    def li(slug, label):
        return f'<li><a href="{PAGES[slug]}">{label}</a></li>' if has_page(slug) else ''
    nav = ''.join(f'<a href="{PAGES[s]}">{t}</a>' for s, t in
                  [('ai-audit', 'AI Audit'), ('ai-crew', 'The Crew'), ('private-local-ai', 'Private AI'),
                   ('pricing', 'Pricing'), ('areas-served', 'Areas')] if has_page(s))
    if has_faq():
        nav += '<a href="/faq/">FAQ</a>'
    if not nav:
        nav = '<a href="/#services">Services</a><a href="/#bot-team">Crew</a><a href="/#about">About</a><a href="/#faq">FAQ</a>'
    header = ('<header class="top"><div class="wrap bar">' + LOGO + f'<nav aria-label="Main">{nav}</nav>'
              '<!--IF:BOOKING_URL--><a class="btn btn-ghost btn-sm hide-md" href="tel:{{PHONE_TEL}}">{{PHONE}}</a>'
              '<a class="btn btn-sm" href="{{BOOKING_URL}}" target="_blank" rel="noopener">Book<span class="hide-sm"> a free</span> intro call</a><!--ENDIF:BOOKING_URL-->'
              '<!--IF:NO_BOOKING--><a class="btn btn-sm" href="tel:{{PHONE_TEL}}"><span class="hide-sm">Call or text </span>{{PHONE}}</a><!--ENDIF:NO_BOOKING-->'
              '</div></header>')
    c['NO_BOOKING'] = not c.get('BOOKING_URL')
    services = (li('ai-audit', 'AI Audit') + li('ai-crew', 'The Crew: AI bots for back-office work') +
                li('private-local-ai', 'Private local AI') + li('pricing', 'Pricing'))
    industries = (li('real-estate-teams', 'AI for real estate teams') +
                  li('field-and-home-services', 'AI for field and home-services companies'))
    company = ('<li><a href="/">Home</a></li>' + li('areas-served', 'Areas served') +
               ('<li><a href="/faq/">FAQ</a></li>' if has_faq() else '') +
               '<!--IF:BOOKING_URL--><li><a href="{{BOOKING_URL}}" rel="noopener">Book a free 30-minute intro call</a></li><!--ENDIF:BOOKING_URL-->')
    cols = ''
    if services:
        cols += f'<div><p class="foot-h">Services</p><ul>{services}</ul></div>'
    if industries:
        cols += f'<div><p class="foot-h">Industries</p><ul>{industries}</ul></div>'
    footer = '<footer class="foot"><div class="wrap">'
    if cols:
        footer += f'<div class="foot-nav">{cols}<div><p class="foot-h">Embrose AI</p><ul>{company}</ul></div></div>'
    footer += ('<p><strong>{{BUSINESS_NAME}}</strong> · Franklin, Indiana · <a href="tel:{{PHONE_TEL}}">{{PHONE}}</a>'
               '<!--IF:SHOW_EMAIL--> · <a href="mailto:{{EMAIL}}">{{EMAIL}}</a><!--ENDIF:SHOW_EMAIL--></p>'
               '<p class="fine foot-legal">© 2026 {{LEGAL_NAME}} · <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></p>'
               '</div></footer>')
    return header, footer


NOTE_RE = re.compile(r'\s*\*\((?:[^()]|\([^()]*\))*\)\*')


def strip_notes(s):
    return NOTE_RE.sub('', s).rstrip()


def plain(md):
    """Markdown inline -> plain text (for JSON-LD and meta)."""
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'\1', md)
    s = re.sub(r'\*\*(.+?)\*\*', r'\1', s)
    s = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'\1', s)
    return s


def inline(md, c):
    """Markdown inline -> HTML, with phone and email auto-linked."""
    links = []

    def keep(m):
        text, href = m.group(1), m.group(2)
        ext = href.startswith('http')
        a = f'<a href="{esc(href)}"' + (' rel="noopener"' if ext else '') + f'>{inline_basic(text)}</a>'
        links.append(a)
        return f'\x00{len(links)-1}\x00'

    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', keep, md)
    s = inline_basic(s)
    s = s.replace(esc(c['PHONE']), f'<a class="nowrap" href="tel:{c["PHONE_TEL"]}">{esc(c["PHONE"])}</a>')
    s = s.replace(c['EMAIL'], f'<a href="mailto:{c["EMAIL"]}">{c["EMAIL"]}</a>')
    return re.sub(r'\x00(\d+)\x00', lambda m: links[int(m.group(1))], s)


def inline_basic(s):
    s = esc(s).replace('&#x27;', "'")
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<em>\1</em>', s)
    return s


def parse(path, render=None):
    text = path.read_text()
    if render:
        text = render(text)
    head, _, rest = text.partition('\n---\n')
    meta = dict(re.findall(r'^\*\*([^*]+):\*\*\s*(.+)$', head, flags=re.M))
    body = rest.split('\n---\n')[0]  # later '---' = editor's note
    sections, cur = [], None
    for line in body.split('\n'):
        if line.startswith('## '):
            cur = {'h2': line[3:].strip(), 'lines': []}
            sections.append(cur)
        elif cur is not None:
            cur['lines'].append(line)
    return meta, sections


def blocks(lines):
    """Group lines into blocks separated by blank lines (lists/tables stay together)."""
    out, buf = [], []
    for ln in lines:
        if ln.strip() == '':
            if buf:
                out.append(buf); buf = []
        else:
            buf.append(ln)
    if buf:
        out.append(buf)
    return out


def cta_buttons(c, size='btn-lg', email=False):
    b = (f'<a class="btn {size}" href="{esc(c["BOOKING_URL"])}" rel="noopener">Book a free 30-minute intro call</a>'
         f'<a class="btn btn-ghost {size}" href="tel:{c["PHONE_TEL"]}">Call {c["PHONE"]}</a>'
         f'<a class="btn btn-ghost {size} sms-only" href="sms:{c["PHONE_TEL"]}">Text {c["PHONE"]}</a>')
    return f'<div class="ctas">{b}</div>'


def render_table(rows, c):
    cells = [[x.strip() for x in r.strip().strip('|').split('|')] for r in rows]
    head, data = cells[0], [r for r in cells[2:]]
    h = ''.join(f'<th scope="col">{inline(x, c)}</th>' for x in head)
    body = ''
    for r in data:
        tds = ''.join(
            (f'<th scope="row" data-label="{esc(plain(head[i]))}">{inline(x, c)}</th>' if i == 0 else
             f'<td data-label="{esc(plain(head[i]))}">{inline(x, c)}</td>')
            for i, x in enumerate(r))
        body += f'<tr>{tds}</tr>'
    return f'<div class="table"><table><thead><tr>{h}</tr></thead><tbody>{body}</tbody></table></div>'


def render_block(b, c):
    first = b[0]
    if first.startswith('|'):
        return render_table(b, c)
    if re.match(r'^\d+\.\s', first):
        return '<ol class="steps-list">' + ''.join(f'<li>{inline(re.sub(r"^\d+\.\s+", "", x), c)}</li>' for x in b) + '</ol>'
    if first.startswith('- ') or (len(b) > 1 and b[1].startswith('- ')):
        out = ''
        items = b
        if not first.startswith('- '):  # bold sub-heading line followed by list
            out += f'<h3>{inline(first.strip("*"), c)}</h3>'
            items = b[1:]
        return out + '<ul class="checks">' + ''.join(f'<li>{inline(x[2:], c)}</li>' for x in items) + '</ul>'
    para = strip_notes(' '.join(x.strip() for x in b))
    if not para:
        return ''
    if para.startswith('[Book a free 30-minute intro call]('):
        return None  # CTA line, handled by caller
    if para.startswith('**Related:**'):
        links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', para)
        return ('<nav class="related" aria-label="Related pages"><span>Related:</span> ' +
                ' '.join(f'<a href="{esc(h)}">{esc(t)}</a>' for t, h in links) + '</nav>')
    if re.match(r'^(\*\*)?Founding offer:', para):
        if not c.get('SHOW_FOUNDING_OFFER'):
            return ''
        return f'<p class="founding">{inline(para, c)}</p>'
    if re.fullmatch(r'\*\*[^*]+\*\*', para):
        return f'<h3>{inline(para[2:-2], c)}</h3>'
    return f'<p>{inline(para, c)}</p>'


def faq_pairs(lines):
    pairs, q = [], None
    for b in blocks(lines):
        m = re.fullmatch(r'\*\*(.+)\*\*', b[0].strip())
        if m:
            ans = strip_notes(' '.join(x.strip() for x in b[1:]))
            if ans:  # an answer that is only an editor's note is not published
                pairs.append((m.group(1), ans))
    return pairs


def faq_html(pairs, c, links=None):
    out = '<div class="qa-list">'
    for i, (q, a) in enumerate(pairs):
        more = ''
        if links and links.get(i):
            t, h = links[i]
            more = f'<p class="qa-more"><a href="{h}">{esc(t)} →</a></p>'
        out += f'<div class="qa"><h3>{inline(q, c)}</h3><p>{inline(a, c)}</p>{more}</div>'
    return out + '</div>'


def faq_ld(pairs, page_url):
    return {"@type": "FAQPage", "@id": page_url + "#faq", "mainEntity": [
        {"@type": "Question", "name": plain(q),
         "acceptedAnswer": {"@type": "Answer", "text": plain(a)}} for q, a in pairs]}


def crumbs(c, trail, url):
    """trail: list of (name, path or None). Industries has no hub page, so it is shown unlinked
    and left out of the BreadcrumbList (schema_notes.md section 3 note)."""
    vis = '<nav class="crumbs" aria-label="Breadcrumb"><ol>'
    for i, (name, path) in enumerate(trail):
        if i == len(trail) - 1:
            vis += f'<li aria-current="page">{esc(name)}</li>'
        elif path:
            vis += f'<li><a href="{path}">{esc(name)}</a></li>'
        else:
            vis += f'<li>{esc(name)}</li>'
    vis += '</ol></nav>'
    items = [(n, p) for n, p in trail if p]
    ld = {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": c['DOMAIN'] + p}
        for i, (n, p) in enumerate(items)]}
    return vis, ld


def service_ld(slug, url, c):
    d = c['DOMAIN']
    biz = {"@id": d + "/#business"}
    if slug == 'ai-audit':
        return {"@type": "Service", "@id": url + "#service", "name": "AI Audit",
                "serviceType": "AI consulting / AI readiness assessment",
                "description": "A fixed-price review of your workflows with a prioritized list of AI opportunities, tool recommendations and a written roadmap, on-site or remote.",
                "provider": biz, "areaServed": AREA,
                "audience": {"@type": "BusinessAudience", "name": "Small businesses with 5–50 people"},
                "offers": {"@type": "Offer", "price": "1500", "priceCurrency": "USD", "url": url}}
    if slug == 'ai-crew':
        return {"@type": "Service", "@id": url + "#service", "name": "The Embrose Crew: AI bots for back-office work",
                "serviceType": "AI bots for billing and back-office work",
                "description": "AI bots set up and managed by Embrose AI to do repetitive computer work such as matching payments to invoices, preparing invoices and drafting follow-ups, with a person approving anything sensitive.",
                "provider": biz, "areaServed": AREA,
                "audience": {"@type": "BusinessAudience", "name": "Small businesses with 5–50 people"},
                "offers": [
                    {"@type": "Offer", "name": "Embrose Crew 30-Day Pilot", "price": "1500", "priceCurrency": "USD", "url": url},
                    {"@type": "Offer", "name": "Embrose Crew Starter", "url": url, "priceSpecification": [
                        {"@type": "PriceSpecification", "name": "Setup", "price": "3500", "priceCurrency": "USD"},
                        {"@type": "UnitPriceSpecification", "name": "Monthly management", "price": "750", "priceCurrency": "USD", "unitCode": "MON"}]},
                    {"@type": "Offer", "name": "Embrose Crew Full Team", "url": url, "priceSpecification": [
                        {"@type": "PriceSpecification", "name": "Setup", "minPrice": "7500", "priceCurrency": "USD"},
                        {"@type": "UnitPriceSpecification", "name": "Monthly management", "price": "1500", "priceCurrency": "USD", "unitCode": "MON"}]}]}
    if slug == 'private-local-ai':
        return {"@type": "Service", "@id": url + "#service", "name": "Private / local AI setup and AI server builds",
                "serviceType": "Private on-premise AI model setup and AI server builds",
                "description": "Installing and configuring AI models that run on computers or servers the client owns, so data stays in-house, with optional dedicated AI hardware billed separately.",
                "provider": biz, "areaServed": AREA,
                "offers": {"@type": "Offer", "description": "Quoted after the $1,500 AI Audit; hardware billed separately", "url": url}}
    if slug in ('real-estate-teams', 'field-and-home-services'):
        re_ = slug == 'real-estate-teams'
        return {"@type": "Service", "@id": url + "#service",
                "name": "AI for real estate teams" if re_ else "AI for field, construction and home-services companies",
                "serviceType": "AI automation and AI agents", "provider": biz, "areaServed": AREA,
                "audience": {"@type": "BusinessAudience", "name": "Real estate teams" if re_ else "Contractors, field crews and home-services companies"},
                "offers": [
                    {"@type": "Offer", "name": "AI Audit", "price": "1500", "priceCurrency": "USD", "url": d + "/ai-audit/"},
                    {"@type": "Offer", "name": "Embrose Crew 30-Day Pilot", "price": "1500", "priceCurrency": "USD", "url": d + "/ai-crew/"}]}
    # pricing, areas-served: WebPage
    node = {"@type": "WebPage", "@id": url + "#webpage", "url": url, "isPartOf": {"@id": d + "/#website"}}
    if slug == 'pricing':
        node["mainEntity"] = biz
    else:
        node["about"] = biz
    return node


def ld_json(graph):
    s = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=1)
    return s.replace('</', '<\\/')


def fill(tpl, **kw):
    for k, v in kw.items():
        tpl = tpl.replace(f'[[{k}]]', v)
    return tpl


def page_body(sections, c, faq_links=None, legal=False):
    html_out, faq = '', []
    for i, sec in enumerate(sections):
        h2 = sec['h2']
        sid = re.sub(r'[^a-z0-9]+', '-', h2.lower()).strip('-')
        is_last = i == len(sections) - 1
        cls = 'answer' if h2 == 'The short answer' else ('cta-block' if is_last and not legal else '')
        inner = ''
        if 'FAQs' in h2:
            pairs = faq_pairs(sec['lines'])
            faq = pairs
            inner = faq_html(pairs, c)
        else:
            for b in blocks(sec['lines']):
                r = render_block(b, c)
                if r is None:  # CTA line
                    inner += cta_buttons(c, email=is_last)
                    if is_last:
                        inner += f'<p class="fine">Or email <a href="mailto:{c["EMAIL"]}">{c["EMAIL"]}</a>.</p>'
                else:
                    inner += r
        html_out += f'<section class="psec {cls}" id="{sid}" aria-labelledby="{sid}-h"><h2 id="{sid}-h">{inline(h2, c)}</h2>{inner}</section>\n'
    return html_out, faq


def build(out, c, render):
    tpl = render((ROOT / 'templates' / 'page.html').read_text())
    report = []
    for slug, path in PAGES.items():
        if not has_page(slug):
            continue
        meta, sections = parse(ROOT / 'content' / 'pages' / f'{slug}.md')
        url = c['DOMAIN'] + path
        body, faq = page_body(sections, c)
        trail = [('Home', '/')]
        bc = [x.strip() for x in meta['Breadcrumb'].split('>')][1:]
        if path.startswith('/industries/'):
            trail += [(bc[0], None), (bc[1], path)]
        else:
            trail += [(bc[0], path)]
        vis, bl = crumbs(c, trail, url)
        graph = [service_ld(slug, url, c), bl]
        if faq:
            graph.append(faq_ld(faq, url))
        doc = fill(tpl, TITLE=esc(meta['Title tag']), DESC=esc(meta['Meta description']), URL=url,
                   H1=inline(meta['H1'], c), CRUMBS=vis, BODY=body, JSONLD=ld_json(graph))
        dest = out / path.strip('/') / 'index.html'
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(doc)
        report.append((path, meta['Title tag'], meta['Meta description']))

    # legal pages: WebPage + BreadcrumbList, no FAQ. Rendered through render() first so
    # {{LEGAL_NAME}}, {{LEGAL_UPDATED}} and IF:BOOKING_URL blocks resolve from config.json.
    for slug, path in LEGAL.items():
        meta, sections = parse(ROOT / 'content' / 'legal' / f'{slug}.md', render)
        url = c['DOMAIN'] + path
        body, _ = page_body(sections, c, legal=True)
        updated = f'<p class="updated">Last updated: {esc(c.get("LEGAL_UPDATED", ""))}</p>'
        vis, bl = crumbs(c, [('Home', '/'), (meta['Breadcrumb'].split('>')[-1].strip(), path)], url)
        graph = [{"@type": "WebPage", "@id": url + "#webpage", "url": url, "name": meta['H1'],
                  "isPartOf": {"@id": c['DOMAIN'] + "/#website"}, "publisher": {"@id": c['DOMAIN'] + "/#business"}}, bl]
        doc = fill(tpl, TITLE=esc(meta['Title tag']), DESC=esc(meta['Meta description']), URL=url,
                   H1=inline(meta['H1'], c), CRUMBS=vis, BODY=updated + body, JSONLD=ld_json(graph))
        dest = out / slug / 'index.html'
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(doc)
        report.append((path, meta['Title tag'], meta['Meta description']))

    if not has_faq():
        return report
    # /faq/: 12 new Q&As + the 9 home FAQs (taken from the rendered home page so text matches)
    faq_md = (ROOT / 'content' / 'faq.md').read_text()
    fm = dict(re.findall(r'^- (Title|Description|H1): (.+?)(?: \(\d+ chars\))?$', faq_md, flags=re.M))
    new = re.findall(r'^\*\*\d+\.\s+(.+?)\*\*\n(.+)$', faq_md, flags=re.M)
    home = (out / 'index.html').read_text()
    home_faq_sec = home[home.index('id="faq"'):home.index('id="contact"')]
    home_pairs = [(html.unescape(q), html.unescape(a)) for q, a in
                  re.findall(r'<details><summary>([^<]+)</summary><p>(.*?)</p></details>', home_faq_sec)]
    assert len(new) == 12 and len(home_pairs) == 9, (len(new), len(home_pairs))
    links_new = {0: ('AI Audit', '/ai-audit/'), 1: ('Pricing', '/pricing/'), 2: ('Areas served', '/areas-served/'),
                 3: ('AI Audit', '/ai-audit/'), 4: ('The Crew', '/ai-crew/'), 5: ('AI for real estate teams', '/industries/real-estate-teams/'),
                 6: ('AI for field and home-services companies', '/industries/field-and-home-services/'),
                 7: ('Private local AI', '/private-local-ai/'), 8: ('The Crew', '/ai-crew/'), 9: ('The Crew', '/ai-crew/'),
                 10: ('Pricing', '/pricing/'), 11: ('About Collin', '/#about')}
    url = c['DOMAIN'] + '/faq/'
    body = (f'<section class="psec" id="common-questions" aria-labelledby="common-questions-h"><h2 id="common-questions-h">Common questions</h2>{faq_html(new, c, links_new)}</section>\n'
            f'<section class="psec" id="working-together" aria-labelledby="working-together-h"><h2 id="working-together-h">Working together</h2>{faq_html(home_pairs, c)}</section>\n'
            f'<section class="psec cta-block" id="talk" aria-labelledby="talk-h"><h2 id="talk-h">Still have a question?</h2>{cta_buttons(c, email=True)}<p class="fine">Or email <a href="mailto:{c["EMAIL"]}">{c["EMAIL"]}</a>.</p></section>\n')
    vis, bl = crumbs(c, [('Home', '/'), ('FAQ', '/faq/')], url)
    graph = [bl, faq_ld(new + home_pairs, url)]
    doc = fill(tpl, TITLE=esc(fm['Title']), DESC=esc(fm['Description']), URL=url, H1=esc(fm['H1']),
               CRUMBS=vis, BODY=body, JSONLD=ld_json(graph))
    (out / 'faq').mkdir(exist_ok=True)
    (out / 'faq' / 'index.html').write_text(doc)
    report.append(('/faq/', fm['Title'], fm['Description']))

    if not (ROOT / 'content' / 'llms.txt').exists():
        return report
    # llms.txt: drop [PLANNED] tags for pages that exist; drop lines for pages that don't
    built = {c['DOMAIN'] + p for p in ALL_PATHS}
    lines = []
    for ln in render((ROOT / 'content' / 'llms.txt').read_text()).split('\n'):
        if '[PLANNED]' in ln:
            m = re.search(r'\]\((https://[^)]+)\)', ln)
            if not (m and m.group(1) in built):
                continue
            ln = ln.replace(' [PLANNED]', '').replace('[PLANNED]', '')
        lines.append(ln)
    (out / 'llms.txt').write_text('\n'.join(lines))
    return report

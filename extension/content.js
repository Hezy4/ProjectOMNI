// Henry Boes — Lyons Project — Internal Use Only
// Sales Navigator scraper: name, title, current employer, location,
// top-5 past companies (+ dates) and education (Undergrad / Grad / Degree3-5).



/* ─────────────── Utility helpers ─────────────── */
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(selector, timeout = 7000) {
  const iv = 250; let t = 0;
  while (t < timeout) {
    if (document.querySelector(selector)) return true;
    await sleep(iv); t += iv;
  }
  return false;
}

async function smoothScroll(container) {
  const step = 300, delay = 25;
  const max = container.scrollHeight - container.clientHeight;
  for (let y = 0; y < max; y += step) {
    container.scrollTo(0, y); await sleep(delay);
  }
  await sleep(600);
  container.scrollTo(0, 0); await sleep(300);
}

function parseRange(txt = '') {
  const [a, b = ''] = txt.split('–').map(s => s.trim());
  const toDate = s => /present/i.test(s) ? new Date() : new Date(s || '1 Jan 1900');
  const start = toDate(a), end = toDate(b);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return { start, end, months, rangeText: txt.replace(/\s+/g, ' ') };
}

/* ─────────────── Mini-Profile Drawer Scraper ─────────────── */
async function scrapeMiniProfile(nameLink) {
  nameLink.scrollIntoView({ block: 'center' });
  nameLink.click(); await sleep(800);

  const PANEL_SEL = '#inline-sidesheet-outlet div._inline-sidesheet_4y6x1f';
  if (!(await waitFor(PANEL_SEL, 4000))) return {};
  const panel = document.querySelector(PANEL_SEL);
  await smoothScroll(panel);

  /* 1️⃣  Past Companies (top 5 by tenure) */
  const expLis = panel.querySelectorAll(
    'section[data-sn-view-name="feature-lead-experience"] li._experience-entry_1irc72'
  );
  const comps = Array.from(expLis)
    .map(li => {
      const company =
        li.querySelector('[data-anonymize="company-name"]')?.innerText.trim() ||
        li.querySelector('h2[data-anonymize="company-name"]')?.innerText.trim() || '';
      const dateTxt =
        li.querySelector('span.HLinTtoHpbFphgzFIWpGxOwcttNtJmiubzhA')?.innerText.trim() || '';
      return company ? { company, ...parseRange(dateTxt) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.months - a.months)
    .slice(0, 5);

  const past = {};
  comps.forEach((o, i) => {
    const n = i + 1;
    past[`PastCompany${n}`] = o.company;
    past[`PastCompany${n}Dates`] = o.rangeText;
  });

  /* 2️⃣  Education (up to 5 rows) */
  const eduLis = panel.querySelectorAll(
    'section[data-sn-view-name="feature-lead-education"] li'
  );
  const edus = Array.from(eduLis)
    .slice(0, 5)
    .map(li => {
      const school = li.querySelector('h3[data-anonymize="education-name"]')?.innerText.trim() || '';
      const degreeTxt = li.querySelector('p._bodyText_1e5nen span')?.innerText.trim() || '';
      const dates = Array.from(li.querySelectorAll('time'))
        .map(t => t.innerText.trim())
        .join(' – ');
      // Infer degree category
      let cat = "Bachelor's";
      const low = degreeTxt.toLowerCase();
      if (low.includes('high school')) cat = 'High School';
      else if (low.includes('associate')) cat = 'Associate';
      else if (low.includes('master') || low.includes('mfa') || low.includes('ms')) cat = "Master's";
      else if (low.includes('doctor') || low.includes('phd')) cat = 'Doctorate';
      return { school, degree: cat, dates };
    });

  const edu = {};
  if (edus[0]) Object.assign(edu, {
    UndergradSchool: edus[0].school,
    UndergradDegree: edus[0].degree,
    UndergradDates:  edus[0].dates
  });
  if (edus[1]) Object.assign(edu, {
    GradSchool: edus[1].school,
    GradDegree: edus[1].degree,
    GradDates:  edus[1].dates
  });
  for (let i = 2; i < edus.length; i++) {
    const n = i + 1;
    edu[`Degree${n}School`] = edus[i].school;
    edu[`Degree${n}Degree`] = edus[i].degree;
    edu[`Degree${n}Dates`]  = edus[i].dates;
  }


/* ── Mutual connections pop-up ─────────────────────────── */
let mutuals = [];
const mutualBtn = panel.querySelector(
  'button[data-control-name="search_spotlight_second_degree_connection"]'
);
if (mutualBtn) {
  mutualBtn.click();
  await sleep(600);

  // Wait for pop-up
  const POP_SEL = 'div._tooltip-content_leb3qf._visible_leb3qf';
  if (await waitFor(POP_SEL, 3000)) {
    const pop = document.querySelector(POP_SEL);
    const scrollBox = pop.querySelector('div._content-scroll-container_1loqoh');
    if (scrollBox) await smoothScroll(scrollBox);

    // One <li> per first-degree mutual
    mutuals = Array.from(
      pop.querySelectorAll('li.flex.align-items-flex-start')
    ).map(li => {
      const mName = li.querySelector('a[data-anonymize="person-name"]')
                     ?.innerText.trim() || '';
      const mComp = li.querySelector('a[data-anonymize="company-name"]')
                     ?.innerText.trim() || '';
      const mLoc  = li.querySelector('span[data-anonymize="location"]')
                     ?.innerText.trim() || '';
      return mName ? { Name: mName, Employer: mComp, Location: mLoc } : null;
    }).filter(Boolean);

    // Close pop-up
    pop.querySelector('button[data-x--button^="close-spotlight"]')?.click();
    await sleep(300);
  }
}

/* add mutuals to return object */

  // Close drawer
  document.body.click(); await sleep(300);
  return {past, edu, mutuals};
}

/* ─────────────── Main Loop ─────────────── */
(async () => {
  const rows = [], seen = new Set();
  const CARD_SEL = 'div.entity-result, li.artdeco-list__item';

  if (!await waitFor(CARD_SEL, 7000)) {
    return alert('❌ No leads detected.');
  }

  const scrollPane =
    document.querySelector('#search-results-container') ||
    document.scrollingElement;

  /* ───────── scrapePage() – replace the old version ───────── */
async function scrapePage() {
  const CARD_SEL = 'div.entity-result, li.artdeco-list__item';
  const cards = Array.from(document.querySelectorAll(CARD_SEL));

  for (const card of cards) {
    // ----- basic lead info -----
    const nameSpan = card.querySelector('span[data-anonymize="person-name"]');
    const nameLink = nameSpan?.closest('a');
    const name     = nameSpan?.innerText.trim() || '';

    const title    = card.querySelector('span[data-anonymize="title"]')
                      ?.innerText.trim() || '';
    const company  = card.querySelector('a[data-anonymize="company-name"]')
                      ?.innerText.trim() ||
                      card.querySelector('.entity-result__secondary-subtitle')
                      ?.innerText.trim() || '';
    const location = card.querySelector('span[data-anonymize="location"]')
                      ?.innerText.trim() || '';

    const key = `${name}||${company}`;
    if (!name || seen.has(key)) continue;
    seen.add(key);

    // ----- scrape drawer for enrichment -----
    let past = {}, edu = {}, mutuals = [];
    if (nameLink) {
      try {
        ({ past, edu, mutuals } = await scrapeMiniProfile(nameLink));
      } catch (err) {
        console.warn('Mini-profile scrape failed:', name, err);
      }
    }

    // ----- push the primary lead row -----
    rows.push({
      Name: name,
      Title: title,
      Employer: company,
      Location: location,
      ConnectedTo: '',      // empty for primary lead
      ...past,
      ...edu
    });

    // ----- push one row per mutual -----
    mutuals.forEach(m => {
      const mKey = `${m.Name}||${m.Employer}`;
      if (seen.has(mKey)) return;
      seen.add(mKey);

      rows.push({
        Name: m.Name,
        Title: '',
        Employer: m.Employer,
        Location: m.Location,
        ConnectedTo: name,   // reference back to the lead
        // enrichment columns left blank
      });
    });
  }
}


  await smoothScroll(scrollPane);
  await scrapePage();

  while (true) {
    const next = document.querySelector('button[aria-label="Next"], button.artdeco-pagination__button--next');
    if (!next || next.disabled) break;
    next.scrollIntoView({ block: 'center' }); await sleep(400); next.click();
    await sleep(1600);
    if (!await waitFor(CARD_SEL, 8000)) break;
    await smoothScroll(scrollPane);
    await scrapePage();
  }

  if (!rows.length) return alert('❌ No data captured.');
  const headers = [...new Set(rows.flatMap(Object.keys))];
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${(r[h] || '').replace(/"/g,'""')}"`).join(','))
  ].join('\r\n');

  const blob = new Blob([csv], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'salesnav_profiles.csv';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert(`✅ Exported ${rows.length} profiles.`);
})();

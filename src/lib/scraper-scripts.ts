export const SPEED_CONTRACTS_SCRAPER = `
(function() {
  const results = { contracts: [], source: 'speed_erp', scraped_at: new Date().toISOString(), page_url: window.location.href };

  // Try multiple selectors for Speed ERP contract tables
  const tables = document.querySelectorAll('table');
  let contractTable = null;

  for (const table of tables) {
    const headers = Array.from(table.querySelectorAll('th, thead td')).map(h => h.textContent.trim().toLowerCase());
    if (headers.some(h => h.includes('contract') || h.includes('agreement') || h.includes('rental'))) {
      contractTable = table;
      break;
    }
  }

  // Fallback: look for the largest table with data
  if (!contractTable && tables.length > 0) {
    contractTable = Array.from(tables).reduce((a, b) =>
      (a.querySelectorAll('tr').length > b.querySelectorAll('tr').length) ? a : b
    );
  }

  if (contractTable) {
    const headers = Array.from(contractTable.querySelectorAll('th, thead td')).map(h => h.textContent.trim().toLowerCase().replace(/[\\s\\/]+/g, '_'));
    const rows = contractTable.querySelectorAll('tbody tr');

    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 3) return;

      const obj = {};
      cells.forEach((cell, idx) => {
        if (headers[idx]) obj[headers[idx]] = cell.textContent.trim();
      });
      results.contracts.push(obj);
    });
  }

  // Also try to find contract cards/lists (modern UI patterns)
  if (results.contracts.length === 0) {
    const cards = document.querySelectorAll('[class*="contract"], [class*="rental"], [class*="agreement"], [data-contract], [data-rental]');
    cards.forEach(card => {
      const text = card.textContent;
      const obj = { raw_text: text.substring(0, 500) };
      // Extract common patterns
      const contractMatch = text.match(/(?:Contract|Agreement|Rental)\\s*(?:#|No\\.?|Number)?\\s*[:.]?\\s*([A-Z0-9-]+)/i);
      if (contractMatch) obj.contract_id = contractMatch[1];
      const phoneMatch = text.match(/(\\+?971[\\d\\s-]{8,}|05[\\d\\s-]{8,})/);
      if (phoneMatch) obj.phone = phoneMatch[1];
      const plateMatch = text.match(/([A-Z]{1,3}\\s+[A-Z]?\\s*\\d{1,5})/);
      if (plateMatch) obj.plate = plateMatch[1];
      results.contracts.push(obj);
    });
  }

  // Grab any visible stats/summary
  results.page_title = document.title;
  results.visible_text_summary = document.body.innerText.substring(0, 2000);

  return JSON.stringify(results);
})()
`;

export const SPEED_NAV_SCRAPER = `
(function() {
  const links = Array.from(document.querySelectorAll('a, button, [role="menuitem"], [role="tab"], nav li'));
  const navItems = links.map(el => ({
    text: el.textContent.trim().substring(0, 100),
    href: el.getAttribute('href') || '',
    tag: el.tagName,
    classes: el.className.substring(0, 200)
  })).filter(item => item.text.length > 0 && item.text.length < 100);

  return JSON.stringify({
    url: window.location.href,
    title: document.title,
    nav_items: navItems.slice(0, 100)
  });
})()
`;

export const GALLABOX_CONTACTS_SCRAPER = `
(function() {
  const results = { contacts: [], conversations: [], source: 'gallabox', scraped_at: new Date().toISOString() };

  // Scrape conversation list
  const convItems = document.querySelectorAll('[class*="conversation"], [class*="chat-item"], [class*="contact-item"], [class*="inbox-item"]');
  convItems.forEach(item => {
    const name = item.querySelector('[class*="name"], [class*="title"], h3, h4, strong');
    const phone = item.querySelector('[class*="phone"], [class*="number"], [class*="subtitle"]');
    const lastMsg = item.querySelector('[class*="message"], [class*="preview"], [class*="snippet"]');
    const time = item.querySelector('[class*="time"], [class*="date"], time');

    results.conversations.push({
      name: name?.textContent?.trim() || '',
      phone: phone?.textContent?.trim() || '',
      last_message: lastMsg?.textContent?.trim() || '',
      time: time?.textContent?.trim() || '',
    });
  });

  // Also get page text for context
  results.page_title = document.title;
  results.page_url = window.location.href;

  return JSON.stringify(results);
})()
`;

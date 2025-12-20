import type { Page, Frame } from 'playwright';
import type {
  InteractiveElement,
  PageState,
  PageStateOptions,
  PageStateLite,
  PageStateCompact,
  TableSummary
} from './types.js';

// Default limits for page state extraction
export const DEFAULT_STATE_OPTIONS: Required<PageStateOptions> = {
  lite: false,
  maxElements: 200,
  maxHtmlLength: 50000,
  maxTextLength: 5000,
  includeIframes: false,
};

// Interactive element selectors - expanded for common CRM patterns
const INTERACTIVE_SELECTORS = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="textbox"]',
  '[role="combobox"]',
  '[onclick]',
  '[tabindex]:not([tabindex="-1"])',
  '[data-test-id]',
  '[data-selenium-test]',
  '[contenteditable="true"]'
].join(', ');

/**
 * Extract full page state including HTML, text content, and interactive elements
 */
export async function extractPageState(
  page: Page | Frame,
  options: PageStateOptions = {}
): Promise<PageState> {
  const opts = { ...DEFAULT_STATE_OPTIONS, ...options };

  const [url, title, html, textContent, interactiveElements] = await Promise.all([
    page.url(),
    page.title(),
    opts.lite ? Promise.resolve('') : extractFilteredHTML(page, opts.maxHtmlLength),
    opts.lite ? Promise.resolve('') : extractTextContent(page, opts.maxTextLength),
    extractInteractiveElements(page, opts.maxElements),
  ]);

  // Viewport is only available on Page, not Frame
  const viewport = 'viewportSize' in page && page.viewportSize()
    ? page.viewportSize()!
    : { width: 1280, height: 720 };

  return {
    url,
    title,
    html,
    textContent,
    interactiveElements,
    viewport,
  };
}

/**
 * Quick lite state for post-action checks
 */
export async function extractPageStateLite(page: Page | Frame): Promise<PageStateLite> {
  const [url, title] = await Promise.all([
    page.url(),
    page.title(),
  ]);

  const elementCount = await page.evaluate(`
    (function() {
      const selector = ${JSON.stringify(INTERACTIVE_SELECTORS)};
      return document.querySelectorAll(selector).length;
    })()
  `);

  const viewport = 'viewportSize' in page && page.viewportSize()
    ? page.viewportSize()!
    : { width: 1280, height: 720 };

  return {
    url,
    title,
    elementCount: elementCount as number,
    viewport,
  };
}

/**
 * Compact state optimized for AI - groups elements by type, extracts table data
 */
export async function extractPageStateCompact(
  page: Page | Frame,
  options: PageStateOptions = {}
): Promise<PageStateCompact> {
  const opts = { ...DEFAULT_STATE_OPTIONS, ...options };
  const [url, title] = await Promise.all([
    page.url(),
    page.title(),
  ]);

  const extracted = await page.evaluate(`
    (function() {
      const selector = ${JSON.stringify(INTERACTIVE_SELECTORS)};
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const maxEl = ${opts.maxElements};

      const buttons = [];
      const links = [];
      const inputs = [];
      const other = [];
      const seen = new Set();

      function getKind(el) {
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute('role');
        const type = el.getAttribute('type');

        if (tag === 'button' || role === 'button') return 'btn';
        if (tag === 'a') return 'link';
        if (tag === 'input') {
          if (type === 'checkbox') return 'checkbox';
          if (type === 'radio') return 'radio';
          if (type === 'submit' || type === 'button') return 'btn';
          return 'input';
        }
        if (tag === 'select') return 'select';
        if (tag === 'textarea') return 'input';
        if (role === 'tab') return 'tab';
        if (role === 'menuitem') return 'menu';
        return 'other';
      }

      function getSelector(el) {
        const tag = el.tagName.toLowerCase();
        const dataTestId = el.getAttribute('data-test-id');
        const dataSeleniumTest = el.getAttribute('data-selenium-test');
        let dataTableExternalId = el.getAttribute('data-table-external-id');
        const dataColumnIndex = el.getAttribute('data-column-index');

        if (!dataTableExternalId && tag === 'a') {
          try {
            const parentCell = el.closest && el.closest('td[data-table-external-id], th[data-table-external-id]');
            if (parentCell) {
              dataTableExternalId = parentCell.getAttribute && parentCell.getAttribute('data-table-external-id');
            }
          } catch (e) {}
        }

        if (dataTableExternalId) {
          try {
            const row = el.closest && el.closest('tr[data-test-id^="row-"]');
            const rowTestId = row && row.getAttribute && row.getAttribute('data-test-id');
            if (rowTestId) {
              if (tag === 'a') {
                return '[data-test-id="' + rowTestId + '"] [data-table-external-id="' + dataTableExternalId + '"] a[data-link]';
              }
              return '[data-test-id="' + rowTestId + '"] [data-table-external-id="' + dataTableExternalId + '"]';
            }
          } catch (e) {}
          if (tag === 'a') {
            return '[data-table-external-id="' + dataTableExternalId + '"] a[data-link]';
          }
          return '[data-table-external-id="' + dataTableExternalId + '"]';
        }

        if (dataTestId && dataTestId !== 'framework-data-table-editable-cell') {
          return '[data-test-id="' + dataTestId + '"]';
        }
        if (dataSeleniumTest) return '[data-selenium-test="' + dataSeleniumTest + '"]';
        if (el.id) return '#' + el.id;
        if (el.getAttribute('name')) return tag + '[name="' + el.getAttribute('name') + '"]';
        if (el.getAttribute('aria-label')) return tag + '[aria-label="' + el.getAttribute('aria-label') + '"]';
        if (dataTestId) return '[data-test-id="' + dataTestId + '"]';
        if (dataColumnIndex && tag === 'td') return 'td[data-column-index="' + dataColumnIndex + '"]';

        if (tag === 'a' && el.getAttribute('href')) {
          const href = el.getAttribute('href');
          if (href.length < 60) return 'a[href="' + href + '"]';
        }

        return '';
      }

      function getText(el) {
        const tag = el.tagName.toLowerCase();
        let text = '';

        if (el instanceof HTMLInputElement) {
          text = el.placeholder || el.value || el.name || '';
        } else if (el instanceof HTMLSelectElement) {
          text = (el.options[el.selectedIndex] || {}).text || '';
        } else {
          text = el.getAttribute('aria-label') || el.getAttribute('title') ||
                 (el.textContent || '').trim().substring(0, 50);
        }

        return text.replace(/\\s+/g, ' ').trim().substring(0, 50);
      }

      const nodes = document.querySelectorAll(selector);
      for (const el of nodes) {
        const rect = el.getBoundingClientRect();

        if (rect.width < 5 || rect.height < 5) continue;

        const inViewport = rect.y >= 0 && rect.y < viewport.height && rect.x >= 0 && rect.x < viewport.width;

        try {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
        } catch(e) {}

        const sel = getSelector(el);
        if (!sel) continue;

        const key = sel;
        if (seen.has(key)) continue;
        seen.add(key);

        const kind = getKind(el);
        const text = getText(el);
        const disabled = el.disabled === true;

        const item = { s: sel, t: text, k: kind };
        if (disabled) item.d = true;

        const target = kind === 'btn' ? buttons : kind === 'link' ? links :
                       (kind === 'input' || kind === 'select' || kind === 'checkbox' || kind === 'radio') ? inputs : other;

        if (inViewport) {
          target.unshift(item);
        } else {
          target.push(item);
        }
      }

      // Extract table data
      const tables = [];
      const tableEls = document.querySelectorAll('table');
      for (const table of tableEls) {
        const headers = [];
        const tableRows = [];
        let hasRowIds = false;

        const headerCells = table.querySelectorAll('thead th, thead td');
        for (const th of headerCells) {
          if (th.getAttribute('data-selection-column')) continue;
          const text = (th.textContent || '').trim().substring(0, 30);
          if (text) headers.push(text);
        }

        const rows = table.querySelectorAll('tbody tr');
        const rowCount = rows.length;

        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const row = rows[i];

          let rowId = null;
          const testId = row.getAttribute('data-test-id');
          if (testId && testId.startsWith('row-')) {
            rowId = testId.replace('row-', '');
            hasRowIds = true;
          }

          const cellData = [];
          const cells = row.querySelectorAll('td');
          for (const cell of cells) {
            if (cell.getAttribute('data-selection-column')) continue;

            let text = '';
            const link = cell.querySelector('a[data-link]');
            if (link) {
              text = (link.textContent || '').trim();
            } else {
              text = (cell.textContent || '').trim();
            }

            text = text.replace(/\\s+/g, ' ').substring(0, 40);
            cellData.push(text || '--');
          }

          if (cellData.length > 0) {
            tableRows.push({ id: rowId, cells: cellData });
          }
        }

        if (headers.length > 0 || tableRows.length > 0) {
          const tableData = { headers, rowCount, rows: tableRows };

          if (hasRowIds) {
            tableData.patterns = {
              select: '[data-test-id="checkbox-select-row-{id}"]',
              preview: '[data-test-id="preview-{id}"]',
              click: 'a[href*="record/0-1/{id}"]'
            };
          }

          tables.push(tableData);
        }
      }

      // HubSpot (and some CRMs) often render "tables" as div/virtualized rows, not <table>.
      // If no native tables were found, attempt a fallback extraction from HubSpot-style row ids.
      if (tables.length === 0) {
        try {
          const rows = document.querySelectorAll('tr[data-test-id^="row-"], [data-test-id^="row-"]');
          const fallbackRows = [];
          for (let i = 0; i < Math.min(10, rows.length); i++) {
            const row = rows[i];
            const testId = row.getAttribute && row.getAttribute('data-test-id');
            const rowId = testId && testId.startsWith('row-') ? testId.replace('row-', '') : null;

            // Prefer primary link text as "Name" (common in HubSpot lists)
            let nameText = '';
            const link = row.querySelector && row.querySelector('a[data-link]');
            if (link) {
              nameText = (link.textContent || '').trim();
            }
            if (!nameText) {
              nameText = (row.textContent || '').trim().replace(/\\s+/g, ' ').substring(0, 60);
            }
            if (nameText) {
              fallbackRows.push({ id: rowId, cells: [nameText.substring(0, 60)] });
            }
          }

          if (fallbackRows.length > 0) {
            const tableData = {
              headers: ['Name'],
              rowCount: rows.length,
              rows: fallbackRows
            };
            if (fallbackRows.some(r => r.id)) {
              tableData.patterns = {
                select: '[data-test-id="checkbox-select-row-{id}"]',
                preview: '[data-test-id="preview-{id}"]',
                click: 'a[href*="record/0-1/{id}"]'
              };
            }
            tables.push(tableData);
          }
        } catch (e) {}
      }

      // Get brief text summary
      let summary = '';
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toLowerCase();
          if (tag === 'script' || tag === 'style') return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      let node;
      while ((node = walker.nextNode()) && summary.length < 500) {
        const text = (node.textContent || '').trim();
        if (text) summary += text + ' ';
      }
      summary = summary.trim().substring(0, 500);

      return {
        buttons,
        links,
        inputs,
        other,
        tables,
        summary
      };
    })()
  `) as {
    buttons: PageStateCompact['buttons'];
    links: PageStateCompact['links'];
    inputs: PageStateCompact['inputs'];
    other: PageStateCompact['other'];
    tables: TableSummary[];
    summary: string;
  };

  return {
    url,
    title,
    buttons: extracted.buttons,
    links: extracted.links,
    inputs: extracted.inputs,
    other: extracted.other,
    tables: extracted.tables.length > 0 ? extracted.tables : undefined,
    summary: extracted.summary,
  };
}

/**
 * Extract filtered HTML with noise removed
 */
async function extractFilteredHTML(page: Page | Frame, maxLength: number = 30000): Promise<string> {
  return page.evaluate(`
    (function() {
      const maxLen = ${maxLength};
      const removeElements = new Set(['script', 'style', 'noscript', 'svg', 'path', 'meta', 'link', 'object', 'embed', 'template', 'iframe']);
      const keepAttributes = new Set([
        'id', 'name', 'href', 'src', 'alt', 'title', 'placeholder', 'type', 'value',
        'role', 'disabled', 'readonly', 'checked', 'selected', 'for', 'action', 'method',
        'target', 'rel', 'aria-label', 'aria-labelledby', 'aria-describedby',
        'data-test-id', 'data-selenium-test', 'data-testid', 'data-cy'
      ]);
      const voidElements = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'command', 'embed', 'keygen', 'param', 'source', 'track', 'wbr']);

      let totalLength = 0;
      let truncated = false;

      function processNode(node) {
        if (truncated) return '';

        if (node.nodeType === Node.TEXT_NODE) {
          const text = (node.textContent || '').trim();
          if (text) {
            totalLength += text.length + 1;
            if (totalLength > maxLen) { truncated = true; return ''; }
            return text + ' ';
          }
          return '';
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
          return '';
        }

        const el = node;
        const tagName = el.tagName.toLowerCase();

        if (removeElements.has(tagName)) {
          return '';
        }

        try {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return '';
          }
        } catch (e) {}

        let result = '<' + tagName;
        for (const attr of el.attributes) {
          if ((keepAttributes.has(attr.name) || attr.name.startsWith('data-test') || attr.name.startsWith('data-selenium')) && attr.value) {
            result += ' ' + attr.name + '="' + attr.value.replace(/"/g, '&quot;') + '"';
          }
        }
        result += '>';

        totalLength += result.length;
        if (totalLength > maxLen) { truncated = true; return result; }

        for (const child of el.childNodes) {
          result += processNode(child);
          if (truncated) break;
        }

        if (!voidElements.has(tagName)) {
          result += '</' + tagName + '>';
        }

        return result;
      }

      const result = processNode(document.body);
      return truncated ? result + '... (truncated)' : result;
    })()
  `);
}

/**
 * Extract plain text content from page
 */
async function extractTextContent(page: Page | Frame, maxLength: number = 3000): Promise<string> {
  return page.evaluate(`
    (function() {
      const maxLen = ${maxLength};
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;

            const tag = parent.tagName.toLowerCase();
            if (tag === 'script' || tag === 'style' || tag === 'noscript') {
              return NodeFilter.FILTER_REJECT;
            }

            try {
              const style = window.getComputedStyle(parent);
              if (style.display === 'none' || style.visibility === 'hidden') {
                return NodeFilter.FILTER_REJECT;
              }
            } catch (e) {}

            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const texts = [];
      let totalLen = 0;
      let node;
      while ((node = walker.nextNode())) {
        const text = (node.textContent || '').trim();
        if (text) {
          totalLen += text.length + 1;
          if (totalLen > maxLen) break;
          texts.push(text);
        }
      }

      const result = texts.join(' ').replace(/\\s+/g, ' ').trim();
      return result.length > maxLen ? result.substring(0, maxLen) + '...' : result;
    })()
  `);
}

/**
 * Extract interactive elements from page
 */
async function extractInteractiveElements(page: Page | Frame, maxElements: number = 75): Promise<InteractiveElement[]> {
  const selector = INTERACTIVE_SELECTORS;

  return page.evaluate(`
    (function() {
      const maxEl = ${maxElements};
      const elements = [];
      const nodes = document.querySelectorAll(${JSON.stringify(selector)});
      const seen = new Set();
      const viewport = { width: window.innerWidth, height: window.innerHeight };

      function getPriority(el, rect) {
        let score = 0;
        if (rect.y >= 0 && rect.y < viewport.height && rect.x >= 0 && rect.x < viewport.width) {
          score += 100;
        }
        if (el.getAttribute('data-test-id') || el.getAttribute('data-selenium-test')) {
          score += 50;
        }
        const tag = el.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') {
          score += 30;
        }
        if (tag === 'button' || el.getAttribute('role') === 'button') {
          score += 20;
        }
        if (tag === 'a') {
          score += 10;
        }
        return score;
      }

      const candidates = [];

      for (const el of nodes) {
        const rect = el.getBoundingClientRect();

        if (rect.width < 1 || rect.height < 1) continue;

        try {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            continue;
          }
        } catch (e) {}

        let text = '';
        const tagName = el.tagName.toLowerCase();

        if (el instanceof HTMLInputElement) {
          text = el.placeholder || el.value || el.name || '';
        } else if (el instanceof HTMLTextAreaElement) {
          text = el.placeholder || el.value || el.name || '';
        } else if (el instanceof HTMLSelectElement) {
          text = (el.options[el.selectedIndex] || {}).text || el.name || '';
        } else {
          const directText = Array.from(el.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent.trim())
            .join(' ')
            .trim();
          text = directText || (el.textContent || '').trim();
        }

        if (!text) {
          text = el.getAttribute('aria-label') || el.getAttribute('title') || '';
        }

        if (!text) {
          const labelledBy = el.getAttribute('aria-labelledby');
          if (labelledBy) {
            const labelEl = document.getElementById(labelledBy);
            if (labelEl) text = (labelEl.textContent || '').trim();
          }
        }
        if (!text && el.id) {
          const labelFor = document.querySelector('label[for="' + el.id + '"]');
          if (labelFor) text = (labelFor.textContent || '').trim();
        }

        if (!text) {
          text = el.getAttribute('data-test-id') || el.getAttribute('data-selenium-test') || '';
        }

        if (text.length > 80) {
          text = text.substring(0, 80) + '...';
        }

        let selector = '';
        const dataTestId = el.getAttribute('data-test-id');
        const dataSeleniumTest = el.getAttribute('data-selenium-test');

        if (dataTestId) {
          selector = '[data-test-id="' + dataTestId + '"]';
        } else if (dataSeleniumTest) {
          selector = '[data-selenium-test="' + dataSeleniumTest + '"]';
        } else if (el.id) {
          selector = '#' + el.id;
        } else if (el.getAttribute('name')) {
          selector = tagName + '[name="' + el.getAttribute('name') + '"]';
        } else if (el.getAttribute('aria-label')) {
          selector = tagName + '[aria-label="' + el.getAttribute('aria-label') + '"]';
        } else if (el.className && typeof el.className === 'string') {
          const classes = el.className.split(' ').filter(function(c) { return c && !c.includes(':') && c.length < 30; });
          if (classes.length > 0) {
            selector = tagName + '.' + classes[0];
          }
        }

        if (!selector) {
          selector = tagName;
        }

        const key = selector + '|' + Math.round(rect.x) + '|' + Math.round(rect.y);
        if (seen.has(key)) continue;
        seen.add(key);

        const attributes = {};
        const attrNames = ['href', 'type', 'name', 'role', 'placeholder',
                          'data-test-id', 'data-selenium-test', 'aria-label'];
        for (const attr of attrNames) {
          const val = el.getAttribute(attr);
          if (val && val.length < 100) attributes[attr] = val;
        }

        candidates.push({
          priority: getPriority(el, rect),
          element: {
            tag: tagName,
            type: el.getAttribute('type') || undefined,
            text: text,
            selector: selector,
            boundingBox: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
            attributes: attributes,
            isVisible: true,
            isEnabled: !el.disabled,
          }
        });
      }

      candidates.sort((a, b) => b.priority - a.priority);
      const topElements = candidates.slice(0, maxEl);

      return topElements.map((c, idx) => ({ ...c.element, index: idx }));
    })()
  `);
}


import { TOOLS, ToolDef } from './tools-data';
import { renderMarkdown } from '../core/markdown';
import guideMarkdown from '../assets/guide.md?raw';

import { renderMergePdfHtml, attachMergePdfHandlers } from './tools/merge-pdf';
import { renderSplitPdfHtml, attachSplitPdfHandlers } from './tools/split-pdf';
import { renderPdfToMdHtml, attachPdfToMdHandlers } from './tools/pdf-to-md';
import { renderMdToHtmlHtml, attachMdToHtmlHandlers } from './tools/md-to-html';
import { renderHtmlToMdHtml, attachHtmlToMdHandlers } from './tools/html-to-md';
import { renderMergeMdHtml, attachMergeMdHandlers } from './tools/merge-md';
import { renderSplitMdHtml, attachSplitMdHandlers } from './tools/split-md';
import { renderMdToPdfHtml, attachMdToPdfHandlers } from './tools/md-to-pdf';

export type Route =
  | { type: 'home' }
  | { type: 'guide' }
  | { type: 'tool'; slug: string };

export function parseCurrentRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (hash.startsWith('tool/')) {
    const slug = hash.replace('tool/', '');
    return { type: 'tool', slug };
  }
  if (hash === 'guide') {
    return { type: 'guide' };
  }

  const path = window.location.pathname;
  if (path === '/guide' || path.endsWith('/guide')) {
    return { type: 'guide' };
  }

  const toolMatch = path.match(/\/tool\/([^/]+)/);
  if (toolMatch) {
    return { type: 'tool', slug: toolMatch[1] };
  }

  return { type: 'home' };
}

export function navigateTo(url: string): void {
  window.history.pushState(null, '', url);
  renderApp();
}

function renderSidebar(currentTool?: ToolDef): string {
  const categories = ['pdf', 'html', 'md'];

  const categorySections = categories
    .map((cat) => {
      const toolItems = TOOLS.filter((t) => t.tags.split(' ').includes(cat))
        .map((t) => {
          const isActive = currentTool && currentTool.slug === t.slug;
          const activeClass = isActive ? 'font-bold bg-gray-100' : '';
          return `
            <li>
              <a href="/tool/${t.slug}" class="block px-2 py-1 rounded hover:bg-gray-100 ${activeClass}">
                ${t.name}
              </a>
            </li>
          `;
        })
        .join('');

      return `
        <details open>
          <summary class="text-xs uppercase text-gray-600 cursor-pointer">
            ${cat}
          </summary>
          <ul class="space-y-1 mt-1">
            ${toolItems}
          </ul>
        </details>
      `;
    })
    .join('');

  return `
    <aside class="w-64 bg-white p-4 shadow space-y-3">
      <a href="/" class="font-bold block">All tools</a>
      <input
        id="q"
        placeholder="Search tools"
        class="w-full border rounded px-2 py-1"
      />
      <div id="nav" class="space-y-2">
        ${categorySections}
      </div>
    </aside>
  `;
}

function attachSidebarHandlers(aside: HTMLElement): void {
  const q = aside.querySelector('#q') as HTMLInputElement | null;
  const nav = aside.querySelector('#nav') as HTMLElement | null;

  if (q && nav) {
    q.oninput = () => {
      const s = q.value.toLowerCase();
      nav.querySelectorAll('li').forEach((li) => {
        (li as HTMLElement).hidden = !(li.textContent || '').toLowerCase().includes(s);
      });
      nav.querySelectorAll('details').forEach((d) => {
        const hasVisible = !!d.querySelector('li:not([hidden])');
        (d as HTMLElement).hidden = !hasVisible;
        if (s) (d as HTMLDetailsElement).open = true;
      });
    };
  }
}

function renderHomeView(container: HTMLElement): void {
  const tags = ['', 'pdf', 'md', 'html'];
  const filterButtons = tags
    .map(
      (tag) => `
        <button data-filter="${tag}" class="filter-btn bg-gray-300 px-3 py-1 rounded">
          ${tag || 'all'}
        </button>
      `
    )
    .join('');

  const toolCards = TOOLS.map(
    (t) => `
      <a
        href="/tool/${t.slug}"
        data-tags="${t.tags}"
        class="card bg-white p-4 rounded shadow hover:shadow-md"
      >
        <h2 class="font-bold">${t.name}</h2>
        <p class="text-sm text-gray-600">${t.desc}</p>
      </a>
    `
  ).join('');

  container.innerHTML = `
    <main class="flex-1 flex p-6 pt-16">
      <div class="m-auto w-full max-w-4xl">
        <h1 class="text-2xl font-bold mb-4">All tools</h1>
        <div class="flex gap-2 mb-4">
          ${filterButtons}
        </div>
        <div class="grid grid-cols-3 gap-4">
          ${toolCards}
        </div>
      </div>
    </main>
  `;

  // Attach filter handler
  const cards = container.querySelectorAll<HTMLElement>('.card');
  container.querySelectorAll<HTMLButtonElement>('.filter-btn').forEach((btn) => {
    btn.onclick = () => {
      const tag = btn.dataset.filter || '';
      cards.forEach((c) => {
        const cTags = (c.dataset.tags || '').split(' ');
        c.classList.toggle('hidden', Boolean(tag && !cTags.includes(tag)));
      });
    };
  });
}

function renderGuideView(container: HTMLElement): void {
  const renderedContent = renderMarkdown(guideMarkdown);

  container.innerHTML = `
    <main class="flex-1 flex p-6 pt-16">
      <div class="m-auto w-full max-w-4xl">
        <div class="guide bg-white p-6 rounded shadow">
          <a href="/" title="All tools" class="inline-block mb-4">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </a>
          ${renderedContent}
        </div>
      </div>
    </main>
  `;
}

function renderToolView(container: HTMLElement, slug: string): void {
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) {
    container.innerHTML = `
      <main class="flex-1 flex p-6 pt-16">
        <div class="m-auto w-full max-w-md text-center">
          <h2 class="text-xl font-bold mb-2">Tool not found</h2>
          <a href="/" class="text-blue-600 underline">Back to All Tools</a>
        </div>
      </main>
    `;
    return;
  }

  let toolHtml = '';
  switch (slug) {
    case 'merge':
      toolHtml = renderMergePdfHtml();
      break;
    case 'split':
      toolHtml = renderSplitPdfHtml();
      break;
    case 'pdf-to-md':
      toolHtml = renderPdfToMdHtml();
      break;
    case 'md-to-html':
      toolHtml = renderMdToHtmlHtml();
      break;
    case 'html-to-md':
      toolHtml = renderHtmlToMdHtml();
      break;
    case 'merge-md':
      toolHtml = renderMergeMdHtml();
      break;
    case 'split-md':
      toolHtml = renderSplitMdHtml();
      break;
    case 'md-to-pdf':
      toolHtml = renderMdToPdfHtml();
      break;
  }

  container.innerHTML = `
    ${renderSidebar(tool)}
    <main class="flex-1 flex p-6 pt-16">
      <div class="m-auto w-full max-w-md">
        <div class="bg-white p-4 rounded shadow space-y-3">
          <h2 class="text-xl font-bold">${tool.name}</h2>
          ${toolHtml}
        </div>
      </div>
    </main>
  `;

  const aside = container.querySelector('aside');
  if (aside) {
    attachSidebarHandlers(aside);
  }

  const form = container.querySelector('form');
  if (form) {
    switch (slug) {
      case 'merge':
        attachMergePdfHandlers(form);
        break;
      case 'split':
        attachSplitPdfHandlers(form);
        break;
      case 'pdf-to-md':
        attachPdfToMdHandlers(form);
        break;
      case 'md-to-html':
        attachMdToHtmlHandlers(form);
        break;
      case 'html-to-md':
        attachHtmlToMdHandlers(form);
        break;
      case 'merge-md':
        attachMergeMdHandlers(form);
        break;
      case 'split-md':
        attachSplitMdHandlers(form);
        break;
      case 'md-to-pdf':
        attachMdToPdfHandlers(form);
        break;
    }
  }
}

export function renderApp(): void {
  const appRoot = document.getElementById('app');
  if (!appRoot) return;

  const route = parseCurrentRoute();

  if (route.type === 'home') {
    renderHomeView(appRoot);
  } else if (route.type === 'guide') {
    renderGuideView(appRoot);
  } else if (route.type === 'tool') {
    renderToolView(appRoot, route.slug);
  }
}

export function initRouter(): void {
  window.addEventListener('popstate', () => {
    renderApp();
  });

  window.addEventListener('hashchange', () => {
    renderApp();
  });

  // Intercept relative link clicks to stay inside the client-side router
  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('a');
    if (!target) return;

    const href = target.getAttribute('href');
    if (!href) return;

    // Only intercept local navigation links starting with / or #
    if (href.startsWith('/') && !href.startsWith('//') && !target.hasAttribute('target')) {
      e.preventDefault();
      navigateTo(href);
    }
  });

  renderApp();
}

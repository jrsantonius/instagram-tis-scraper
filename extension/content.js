// TIS Instagram Comment Scraper - Content Script

const SCRAPER_ID = 'tis-scraper-overlay';

function createOverlay() {
  const existing = document.getElementById(SCRAPER_ID);
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = SCRAPER_ID;
  overlay.innerHTML = `
    <div style="
      position: fixed; top: 20px; right: 20px; z-index: 999999;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; padding: 16px 20px; border-radius: 12px;
      box-shadow: 0 8px 32px rgba(102,126,234,0.4);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px; min-width: 240px; max-width: 300px;
    ">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <div style="width:8px;height:8px;border-radius:50%;background:#4ade80;animation:pulse 1s infinite;"></div>
        <strong>TIS Scraper Aktif</strong>
      </div>
      <div id="tis-status" style="color:#e9d5ff;font-size:12px;">Memuat komentar...</div>
      <div id="tis-count" style="font-size:20px;font-weight:700;margin:8px 0;">0</div>
      <div style="color:#e9d5ff;font-size:11px;">komentar terkumpul</div>
      <div id="tis-progress-bar" style="
        margin-top:10px;height:4px;background:rgba(255,255,255,0.2);
        border-radius:2px;overflow:hidden;
      ">
        <div id="tis-progress-fill" style="
          height:100%;width:0%;background:#4ade80;
          transition:width 0.3s ease;border-radius:2px;
        "></div>
      </div>
      <button id="tis-stop-btn" style="
        margin-top:12px;width:100%;padding:8px;
        background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);
        color:white;border-radius:8px;cursor:pointer;font-size:12px;
        transition:background 0.2s;
      " onmouseover="this.style.background='rgba(255,255,255,0.3)'"
        onmouseout="this.style.background='rgba(255,255,255,0.2)'">
        ⏹ Stop Scraping
      </button>
    </div>
    <style>
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    </style>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function updateOverlay(count, status, progress = null) {
  const countEl = document.getElementById('tis-count');
  const statusEl = document.getElementById('tis-status');
  const fillEl = document.getElementById('tis-progress-fill');
  if (countEl) countEl.textContent = count;
  if (statusEl) statusEl.textContent = status;
  if (fillEl && progress !== null) fillEl.style.width = `${progress}%`;
}

function removeOverlay() {
  const el = document.getElementById(SCRAPER_ID);
  if (el) el.remove();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseCommentForData(text, username, profileUrl) {
  const lines = text.split(/[\n|•·,\/]/);
  const lower = text.toLowerCase();

  // Extract @mentions
  const mentions = text.match(/@[\w.]+/g) || [];
  const igHandle = mentions.length > 0 ? mentions[0] : `@${username}`;

  // Category detection
  const categoryKeywords = {
    'Freelancer': ['freelance', 'freelancer', 'independen'],
    'Agency': ['agency', 'agensi', 'studio', 'cv ', 'pt ', 'tim'],
    'Karyawan': ['karyawan', 'employee', 'full time', 'full-time'],
    'Content Creator': ['content creator', 'kreator', 'creator', 'youtuber', 'tiktoker'],
    'Startup': ['startup', 'co-founder', 'founder', 'ceo', 'cto'],
    'Designer': ['desainer', 'designer', 'design'],
    'Developer': ['developer', 'programmer', 'engineer', 'dev'],
    'Marketer': ['marketer', 'marketing', 'digital marketing'],
  };

  // Industry detection
  const industryKeywords = {
    'Teknologi': ['tech', 'teknologi', 'software', 'web', 'app', 'mobile', 'it ', 'saas'],
    'Desain & Kreatif': ['desain', 'design', 'creative', 'kreatif', 'visual', 'grafis', 'graphic'],
    'Digital Marketing': ['digital marketing', 'seo', 'sem', 'ads', 'social media', 'konten'],
    'E-commerce': ['e-commerce', 'ecommerce', 'marketplace', 'jualan', 'tokopedia', 'shopee'],
    'Pendidikan': ['edtech', 'pendidikan', 'education', 'tutor', 'kursus'],
    'Kesehatan': ['health', 'kesehatan', 'medis', 'klinik', 'wellbeing'],
    'Keuangan': ['finance', 'keuangan', 'fintech', 'crypto', 'investasi'],
    'Media & Entertainment': ['media', 'entertainment', 'film', 'musik', 'podcast'],
    'F&B': ['fnb', 'f&b', 'kuliner', 'food', 'restaurant', 'cafe'],
    'Fashion': ['fashion', 'clothing', 'baju', 'apparel'],
    'Properti': ['properti', 'property', 'real estate'],
    'Konsultan': ['konsultan', 'consultant', 'consulting'],
  };

  // Skill detection
  const skillKeywords = [
    'figma', 'photoshop', 'illustrator', 'canva', 'premiere', 'after effects',
    'react', 'vue', 'angular', 'nextjs', 'nodejs', 'python', 'laravel', 'wordpress',
    'seo', 'google ads', 'meta ads', 'facebook ads', 'tiktok ads',
    'copywriting', 'video editing', 'photography', 'videography',
    'branding', 'logo design', 'ui/ux', 'ui ux', 'web design',
    'content writing', 'social media management', 'email marketing',
    'flutter', 'kotlin', 'swift', 'java', 'php', 'mysql', 'postgresql',
    '3d', 'blender', 'cinema 4d', 'motion graphic', 'animasi',
    'voiceover', 'voice over', 'podcast', 'editing',
    'project management', 'scrum', 'agile', 'business analyst',
  ];

  // Experience detection
  const expMatch = lower.match(/(\d+)\s*(?:\+\s*)?(?:tahun|year|yr|thn|th)/);
  const experience = expMatch ? `${expMatch[1]}+ tahun` : 'Tidak disebutkan';

  // Detect category
  let category = 'Lainnya';
  for (const [cat, keys] of Object.entries(categoryKeywords)) {
    if (keys.some(k => lower.includes(k))) { category = cat; break; }
  }

  // Detect industry
  let industry = 'Lainnya';
  for (const [ind, keys] of Object.entries(industryKeywords)) {
    if (keys.some(k => lower.includes(k))) { industry = ind; break; }
  }

  // Detect skills
  const skills = skillKeywords.filter(skill => lower.includes(skill.toLowerCase()));

  // Try to get name from first line or before colon
  let name = username;
  const firstLine = lines[0]?.trim();
  if (firstLine && firstLine.length < 50 && !firstLine.startsWith('@') && !firstLine.startsWith('http')) {
    name = firstLine;
  }

  return {
    username,
    name: name || username,
    ig_handle: igHandle,
    ig_url: profileUrl || `https://www.instagram.com/${username}/`,
    category,
    industry,
    skills: skills.length > 0 ? skills.join(', ') : 'Tidak terdeteksi',
    experience,
    raw_comment: text.replace(/[\n\r]+/g, ' ').substring(0, 300),
    scraped_at: new Date().toISOString(),
  };
}

async function scrapeComments(maxLoad = 50) {
  const overlay = createOverlay();
  let isStopped = false;

  document.getElementById('tis-stop-btn')?.addEventListener('click', () => {
    isStopped = true;
    updateOverlay(0, 'Menghentikan...', 100);
  });

  const collected = new Map();
  let loadCount = 0;

  const collectVisible = () => {
    // Try multiple selectors for Instagram's comment structure
    const commentSelectors = [
      'ul[class*="PdIKs"] li',
      'ul li[role="menuitem"]',
      'div[class*="x9f619"] ul li',
      'article ul li',
      'div[class*="comment"] li',
      // Generic approach
      'li[class*="x1n2onr6"]',
    ];

    let commentNodes = [];
    for (const sel of commentSelectors) {
      const nodes = document.querySelectorAll(sel);
      if (nodes.length > 0) { commentNodes = Array.from(nodes); break; }
    }

    // Fallback: find by structure
    if (commentNodes.length === 0) {
      commentNodes = Array.from(document.querySelectorAll('li')).filter(li => {
        const links = li.querySelectorAll('a[href*="/"]');
        const spans = li.querySelectorAll('span');
        return links.length > 0 && spans.length > 0 && li.innerText?.length > 5;
      });
    }

    commentNodes.forEach(li => {
      try {
        // Get username
        const userLink = li.querySelector('a[href^="/"]');
        if (!userLink) return;

        const href = userLink.getAttribute('href');
        if (!href || href.includes('/p/') || href.includes('/reel/')) return;

        const username = href.replace(/\//g, '').trim();
        if (!username || username.length < 2) return;

        // Get comment text
        const textSpans = Array.from(li.querySelectorAll('span')).filter(s =>
          s.innerText && s.innerText.length > 10 && !s.innerText.includes('Reply') &&
          !s.innerText.match(/^\d+[wdhm]$/) && !s.innerText.match(/^\d+ (likes?|suka)$/)
        );

        const commentText = textSpans.map(s => s.innerText).join(' ').trim();
        if (!commentText || commentText.length < 5) return;

        const profileUrl = `https://www.instagram.com${href}`;

        if (!collected.has(username)) {
          collected.set(username, parseCommentForData(commentText, username, profileUrl));
        }
      } catch {}
    });
  };

  // Load more comments loop
  for (let i = 0; i < maxLoad; i++) {
    if (isStopped) break;

    collectVisible();
    updateOverlay(collected.size, `Memuat batch ${i + 1}/${maxLoad}...`, (i / maxLoad) * 80);

    // Find "Load more" / "Lihat semua komentar" buttons
    const loadMoreBtns = Array.from(document.querySelectorAll('button, span[role="button"]')).filter(el => {
      const text = el.innerText?.toLowerCase() || '';
      return text.includes('load more') || text.includes('lihat') ||
             text.includes('more comment') || text.includes('semua komentar') ||
             text.includes('view all') || text.includes('komentar lainnya') ||
             text.includes('replies') || text.includes('balasan');
    });

    if (loadMoreBtns.length > 0) {
      loadMoreBtns[0].click();
      await sleep(1800 + Math.random() * 600);
    } else {
      // Scroll down to trigger lazy load
      window.scrollBy(0, 500);
      await sleep(1200);

      const afterScroll = collected.size;
      await sleep(800);
      collectVisible();

      if (collected.size === afterScroll && loadMoreBtns.length === 0) {
        updateOverlay(collected.size, 'Semua komentar sudah terkumpul!', 100);
        break;
      }
    }
  }

  collectVisible();
  updateOverlay(collected.size, `Selesai! ${collected.size} profil ditemukan`, 100);
  await sleep(1500);
  removeOverlay();

  return Array.from(collected.values());
}

function convertToCSV(data) {
  if (!data.length) return '';

  const headers = ['username', 'name', 'ig_handle', 'ig_url', 'category', 'industry', 'skills', 'experience', 'raw_comment', 'scraped_at'];
  const rows = data.map(row =>
    headers.map(h => {
      const val = String(row[h] || '').replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

function downloadCSV(csv, filename) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'START_SCRAPE') {
    const maxLoad = msg.maxLoad || 30;
    scrapeComments(maxLoad).then(data => {
      if (data.length === 0) {
        sendResponse({ success: false, error: 'Tidak ada komentar ditemukan. Pastikan Anda berada di halaman post Instagram yang memiliki komentar.' });
        return;
      }
      const csv = convertToCSV(data);
      const filename = `TIS_Instagram_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCSV(csv, filename);

      chrome.storage.local.set({ lastScrapeData: data, lastScrapeDate: new Date().toISOString() });
      sendResponse({ success: true, count: data.length, filename });
    });
    return true; // async
  }

  if (msg.action === 'PING') {
    sendResponse({ ready: true, url: window.location.href });
  }
});

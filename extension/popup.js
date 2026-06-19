const scrapeBtn = document.getElementById('scrapeBtn');
const statusPill = document.getElementById('statusPill');
const statusText = document.getElementById('statusText');
const statusUrl = document.getElementById('statusUrl');
const resultCard = document.getElementById('resultCard');
const resultCount = document.getElementById('resultCount');
const errorCard = document.getElementById('errorCard');
const maxLoadSlider = document.getElementById('maxLoadSlider');
const maxLoadVal = document.getElementById('maxLoadVal');
const openDashboardBtn = document.getElementById('openDashboardBtn');

maxLoadSlider.addEventListener('input', () => {
  maxLoadVal.textContent = maxLoadSlider.value;
});

function setStatus(type, text, url = '') {
  statusPill.className = 'status-pill ' + type;
  statusText.textContent = text;
  statusUrl.textContent = url;
}

function showError(msg) {
  errorCard.textContent = '⚠️ ' + msg;
  errorCard.classList.add('show');
  resultCard.classList.remove('show');
}

function showResult(count) {
  resultCount.textContent = count;
  resultCard.classList.add('show');
  errorCard.classList.remove('show');
}

async function checkPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) { setStatus('error', 'Tab tidak ditemukan'); return null; }

  const url = tab.url || '';
  statusUrl.textContent = url.length > 45 ? url.substring(0, 45) + '...' : url;

  if (!url.includes('instagram.com')) {
    setStatus('error', 'Bukan halaman Instagram');
    scrapeBtn.disabled = true;
    return null;
  }

  setStatus('ready', url.includes('/p/') || url.includes('/reel/')
    ? 'Post terdeteksi — siap scraping ✓'
    : 'Buka post atau reel Instagram dulu');

  return tab;
}

async function startScraping() {
  const tab = await checkPage();
  if (!tab) return;

  const maxLoad = parseInt(maxLoadSlider.value);

  scrapeBtn.disabled = true;
  scrapeBtn.innerHTML = '<span class="spin"></span> Sedang scraping...';
  setStatus('loading', 'Mengumpulkan komentar...');
  errorCard.classList.remove('show');
  resultCard.classList.remove('show');

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    }).catch(() => {});

    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'START_SCRAPE',
      maxLoad,
    });

    if (response?.success) {
      showResult(response.count);
      setStatus('ready', `Selesai! ${response.count} profil → ${response.filename}`);
      chrome.storage.local.set({ lastCount: response.count, lastFile: response.filename });
    } else {
      showError(response?.error || 'Scraping gagal. Coba lagi.');
      setStatus('error', 'Scraping gagal');
    }
  } catch (err) {
    showError('Gagal terhubung ke tab. Refresh halaman Instagram dan coba lagi.');
    setStatus('error', 'Koneksi gagal');
  } finally {
    scrapeBtn.disabled = false;
    scrapeBtn.innerHTML = '🚀 Mulai Scraping';
  }
}

openDashboardBtn.addEventListener('click', () => {
  const dashboardUrl = chrome.runtime.getURL('dashboard.html');
  chrome.tabs.create({ url: dashboardUrl });
});

scrapeBtn.addEventListener('click', startScraping);

checkPage();

chrome.storage.local.get(['lastCount'], (data) => {
  if (data.lastCount) showResult(data.lastCount);
});

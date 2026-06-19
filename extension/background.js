chrome.action.onClicked.addListener((tab) => {
  if (!tab.url?.includes('instagram.com')) {
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'TIS Scraper',
      message: 'Buka halaman post Instagram terlebih dahulu!'
    });
  }
});

/*
 * Tile styling for known apps. An app matches a brand by its webOS app id or
 * by its title. `icon` is a slug for app/icons/<slug>.png (downloaded by
 * tools/fetch_icons.py); `glyph` is one of the built-in drawings in app.js;
 * `wordmark` is drawn as text when there is no image.
 */
var BRANDS = [
  { ids: ['netflix'], titles: ['netflix'], icon: 'netflix', bg: '#000000' },
  { ids: ['youtube.leanback.v4'], titles: ['youtube'], icon: 'youtube', bg: '#ffffff' },
  { ids: ['amazon'], titles: ['prime video', 'amazon prime video'], icon: 'primevideo', bg: '#0f79f3' },
  { ids: ['com.disney.disneyplus-prod'], titles: ['disney+', 'disney plus'], icon: 'disneyplus', bg: '#0b1f4d' },
  { ids: ['hulu'], titles: ['hulu'], icon: 'hulu', bg: '#1ce783' },
  { ids: ['com.apple.appletv'], titles: ['apple tv', 'apple tv+'], icon: 'appletv', bg: '#000000' },
  { ids: ['spotify-beehive'], titles: ['spotify'], icon: 'spotify', bg: '#121212' },
  { ids: ['cdp-30'], titles: ['plex'], icon: 'plex', bg: '#1f1f1f' },
  { ids: [], titles: ['paramount+', 'paramount plus'], icon: 'paramountplus', bg: '#0064ff' },
  { ids: [], titles: ['peacock'], icon: 'peacock', bg: '#000000' },
  { ids: [], titles: ['twitch'], icon: 'twitch', bg: '#9146ff' },
  { ids: [], titles: ['crunchyroll'], icon: 'crunchyroll', bg: '#f47521' },
  { ids: [], titles: ['tubi'], icon: 'tubi', bg: '#7408ff' },
  { ids: [], titles: ['hbo max', 'max'], wordmark: 'HBO max', bg: '#002be7' },

  { ids: ['com.webos.app.livetv'], titles: ['live tv'], glyph: 'tv', bg: '#2b3440' },
  { prefix: 'com.webos.app.hdmi', titles: [], glyph: 'input', bg: '#2b3440' },
  { ids: ['com.webos.app.browser'], titles: ['web browser'], glyph: 'globe', bg: '#2b3440' },
  { ids: ['com.palm.app.settings'], titles: ['settings'], glyph: 'gear', bg: '#2b3440' }
];

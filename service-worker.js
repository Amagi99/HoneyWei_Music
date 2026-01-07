// 缓存名称和版本
const CACHE_NAME = 'honey-wei-music-v1';
const ASSETS_TO_CACHE = [
  '/HoneyWei_Music/index.html',
  '/HoneyWei_Music/index_yun.html',
  '/HoneyWei_Music/images/myself.ico',
  '/HoneyWei_Music/images/apple-touch-icon-v2.png',
  '/HoneyWei_Music/manifest.json'
];

// 安装事件：缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('已打开缓存');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活事件：清理旧缓存
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

//  fetch 事件：网络优先，缓存兜底
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 如果响应正常，将其缓存
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });
        return response;
      })
      .catch(() => {
        // 如果网络请求失败，尝试从缓存获取
        return caches.match(event.request);
      })
  );
});

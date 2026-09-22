/* ==========================================
   بازارچه — Service Worker
   ========================================== */
var CACHE_NAME = 'bazarcheh-v1';
var CDN_HOST = 'cdn.jsdelivr.net';
var GH_HOST = 'raw.githubusercontent.com';

/* فایل‌هایی که همیشه کش می‌شن */
var STATIC_CACHE = [
  'index.html',
  'enter.html',
  'home.html',
  'clothes.html',
  'restaurants.html',
  'profile.html',
  'wallet.html',
  'orders.html',
  'favorites.html',
  'help.html',
  'search.html',
  'notifications.html',
  'chat.html',
  'categories.html',
  'offline.html',
  'manifest.json'
];

/* ==========================================
   Install
   ========================================== */
self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      console.log('[SW] Pre-caching static files');
      return cache.addAll(STATIC_CACHE).catch(function(err){
        console.warn('[SW] Some files failed to cache:', err);
      });
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

/* ==========================================
   Activate — پاک کردن کش قدیمی
   ========================================== */
self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){ return n !== CACHE_NAME; })
             .map(function(n){ return caches.delete(n); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

/* ==========================================
   Fetch Strategy
   ========================================== */
self.addEventListener('fetch', function(event){
  var req = event.request;
  var url = new URL(req.url);

  /* فقط GET */
  if(req.method !== 'GET') return;

  /* CDN (jsDelivr) — Network First */
  if(url.hostname === CDN_HOST){
    event.respondWith(networkFirst(req));
    return;
  }

  /* GitHub Raw — Network First */
  if(url.hostname === GH_HOST){
    event.respondWith(networkFirst(req));
    return;
  }

  /* عکس‌ها — Cache First */
  if(req.destination === 'image'){
    event.respondWith(cacheFirst(req));
    return;
  }

  /* HTML/JS/CSS داخلی — Network First با fallback آفلاین */
  if(url.origin === self.location.origin){
    event.respondWith(networkFirstWithOffline(req));
    return;
  }

  /* بقیه — پیش‌فرض */
  event.respondWith(networkFirst(req));
});

/* ==========================================
   Strategies
   ========================================== */
function cacheFirst(req){
  return caches.match(req).then(function(cached){
    if(cached) return cached;
    return fetch(req).then(function(res){
      if(res && res.status === 200){
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(cache){
          cache.put(req, clone);
        });
      }
      return res;
    }).catch(function(){
      return caches.match('offline.html');
    });
  });
}

function networkFirst(req){
  return fetch(req).then(function(res){
    if(res && res.status === 200){
      var clone = res.clone();
      caches.open(CACHE_NAME).then(function(cache){
        cache.put(req, clone);
      });
    }
    return res;
  }).catch(function(){
    return caches.match(req);
  });
}

function networkFirstWithOffline(req){
  return fetch(req).then(function(res){
    if(res && res.status === 200){
      var clone = res.clone();
      caches.open(CACHE_NAME).then(function(cache){
        cache.put(req, clone);
      });
    }
    return res;
  }).catch(function(){
    return caches.match(req).then(function(cached){
      if(cached) return cached;
      return caches.match('offline.html');
    });
  });
}

/* ==========================================
   پیام از کلاینت
   ========================================== */
self.addEventListener('message', function(event){
  if(event.data === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});

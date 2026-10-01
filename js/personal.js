/* Personal: hovering a link shows a preview of its page hanging from the cursor on a string. Moving
   the cursor sideways tips the card slightly the other way; it straightens again almost at once. */
(function () {
    'use strict';

    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var SPLASH = '/assets/photos/resized/wide_splash_photo-1280.webp';
    // a quick, small tilt that settles in about a fifth of a second (not a slow pendulum)
    var STIFFNESS = 0.18, DAMPING = 0.55, PUSH = 0.6, MAX_ANGLE = 10; // degrees

    // --- the photo preview: the photos page's big photo first, then a different one each hover ---
    var photoImg = document.querySelector('#peek-photo img');
    var photoQueue = [];
    photoImg.src = SPLASH;
    fetch('/assets/photos/photo-index.json')
        .then(function (r) { return r.json(); })
        .then(function (d) {
            photoQueue = (d.color || []).map(function (f) {
                return '/assets/photos/color/resized/' + f.replace(/\.jpg$/, '-800.webp');
            }).sort(function () { return Math.random() - 0.5; });
        })
        .catch(function () {});
    var photoHovers = 0;
    function nextPhoto() {
        if (photoHovers++ === 0 || !photoQueue.length) return;
        photoImg.src = photoQueue[(photoHovers - 2) % photoQueue.length];
    }

    // --- the map preview: every pin, the world view, made on first hover ---
    var mapMade = false;
    function makeMap() {
        if (mapMade || !window.L) return;
        mapMade = true;
        var m = L.map('peek-map-view', { zoomControl: false, attributionControl: false, dragging: false,
            scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false });
        L.tileLayer('https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png', { maxZoom: 20 }).addTo(m);
        m.setView([49.2827, -123.1207], 12);
        // centred on where I am right now (data/now.json), with a pulsing dot there
        fetch('/data/now.json', { cache: 'no-cache' })
            .then(function (r) { return r.json(); })
            .then(function (now) {
                m.setView([now.lat, now.lng], now.zoom || 12);
                L.marker([now.lat, now.lng], { interactive: false, icon: L.divIcon({ className: '',
                    html: '<span class="here-dot"></span>', iconSize: [16, 16], iconAnchor: [8, 8] }) }).addTo(m);
            })
            .catch(function () {});
        fetch('/data/restaurants.json')
            .then(function (r) { return r.json(); })
            .then(function (d) {
                d.restaurants.forEach(function (r) {
                    L.circleMarker([r.lat, r.lng], { radius: r.topRated ? 5 : 3.5, color: '#fff', weight: 1.2,
                        fillColor: '#dc3545', fillOpacity: 1, interactive: false }).addTo(m);
                });
            })
            .catch(function () {});
    }

    // --- the pendulum ---
    var active = null, x = 0, y = 0, lastX = 0, angle = 0, velocity = 0, frame = 0;

    function step() {
        var dx = x - lastX;
        lastX = x;
        // the string pulls the card back toward hanging straight; moving the cursor right leaves the
        // card trailing behind (to the left), which is a clockwise, positive rotation
        velocity += -STIFFNESS * angle + dx * PUSH * 0.1;
        velocity *= DAMPING;
        angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle + velocity));
        if (active) active.style.transform = 'translate(' + x + 'px,' + y + 'px) rotate(' + angle.toFixed(2) + 'deg)';
        var resting = Math.abs(angle) < 0.05 && Math.abs(velocity) < 0.05 && dx === 0;
        frame = active && !resting ? requestAnimationFrame(step) : 0;
    }

    function kick() {
        if (!frame) frame = requestAnimationFrame(step);
    }

    document.querySelectorAll('.peek-link').forEach(function (link) {
        var peek = document.getElementById('peek-' + link.dataset.peek);
        link.addEventListener('mouseenter', function (e) {
            if (link.dataset.peek === 'map') makeMap();
            else nextPhoto();
            active = peek;
            x = lastX = e.clientX;
            y = e.clientY;
            angle = 0;
            velocity = 0;
            peek.style.transform = 'translate(' + x + 'px,' + y + 'px)';
            peek.classList.add('on');
            kick();
        });
        link.addEventListener('mousemove', function (e) {
            x = e.clientX;
            y = e.clientY;
            kick();
        });
        link.addEventListener('mouseleave', function () {
            peek.classList.remove('on');
            if (active === peek) active = null;
        });
    });
})();

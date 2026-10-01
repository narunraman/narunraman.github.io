/* Restaurants: a map of /data/restaurants.json. Pins open a card with my note on the place.
   A floating panel searches places, filters by meal and jumps between cities; the URL hash
   (#place-id or #city-name) opens a place or city directly. */
(function () {
    'use strict';

    var DATA_URL = '/data/restaurants.json';
    var OUTLINES_URL = '/data/city-outlines.json'; // made by scripts/city-outlines.py
    var MIN_CITY = 2; // cities with fewer places don't get their own button
    var MEALS = ['breakfast', 'lunch', 'dinner', 'drinks', 'dessert', 'late night'];
    var MAX_RESULTS = 8;

    var stage = document.querySelector('.rmap-stage');
    var cityBar = document.querySelector('.rmap-cities');
    var card = document.querySelector('.rmap-card');
    var cardBody = card.querySelector('.rmap-card-body');
    var search = document.querySelector('.rmap-search');
    var results = document.querySelector('.rmap-results');
    var mealBar = document.querySelector('.rmap-meals');
    var countLine = document.querySelector('.rmap-count');
    var map, places = [], selected = null;
    var meals = new Set(), query = '', resultIndex = -1;
    var outlines = {}, outlineLayer = null, cityNames = [], citySearchTimer;

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function slug(s) {
        return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    function directionsUrl(r) {
        var q = [r.name, r.address, r.city, r.country].filter(Boolean).join(', ');
        return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
    }

    function pinIcon(r, isSelected) {
        var cls = 'rmap-pin' + (r.topRated ? ' fav' : '') + (r.status !== 'open' ? ' closed' : '') +
            (isSelected ? ' selected' : '');
        var size = r.topRated ? 24 : 14;
        return L.divIcon({ className: '', html: '<div class="' + cls + '"></div>',
                           iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
    }

    function showCard(r) {
        var closed = r.status !== 'open';
        var where = [r.area, r.city].filter(Boolean).join(' · ');
        var tags = (r.cuisine || []).concat(r.meal || []).join(' · ');
        cardBody.innerHTML =
            '<h2>' + esc(r.name) + '</h2>' +
            '<div class="rmap-where">' + esc(where) + '</div>' +
            (r.topRated ? '<span class="rmap-badge">a favourite</span>' : '') +
            (closed ? '<span class="rmap-badge closed">closed</span>' : '') +
            (r.note ? '<p class="rmap-note">' + esc(r.note) + '</p>' : '') +
            (closed && r.closedNote ? '<p class="rmap-note closed-note">' + esc(r.closedNote) + '</p>' : '') +
            (r.order ? '<p class="rmap-note"><b>Order:</b> ' + esc(r.order) + '</p>' : '') +
            (tags ? '<div class="rmap-tags">' + esc(tags) + '</div>' : '') +
            (closed ? '' : '<div class="rmap-actions"><a href="' + directionsUrl(r) +
                '" target="_blank" rel="noopener">Directions ↗</a></div>');
        card.hidden = false;
    }

    function select(r, opts) {
        opts = opts || {};
        if (selected) selected.marker.setIcon(pinIcon(selected, false));
        selected = r;
        if (!r) {
            card.hidden = true;
            if (!opts.keepHash) history.replaceState(null, '', location.pathname);
            return;
        }
        r.marker.setIcon(pinIcon(r, true));
        r.marker.setZIndexOffset(1000);
        showCard(r);
        if (opts.fly) map.flyTo([r.lat, r.lng], Math.max(map.getZoom(), 14), { duration: 0.8 });
        else if (!map.getBounds().pad(-0.15).contains([r.lat, r.lng])) map.panTo([r.lat, r.lng]);
        history.replaceState(null, '', '#' + r.id);
    }

    // --- filtering: meals (any of the chosen ones) and the search words (all of them) ---
    function haystack(r) {
        return [r.name, r.area, r.city, r.region, r.country].concat(r.cuisine || [], r.meal || [])
            .join(' ').toLowerCase();
    }

    function matchesMeals(r) {
        if (!meals.size) return true;
        return (r.meal || []).some(function (m) { return meals.has(m); });
    }

    function matchesQuery(r) {
        var words = query.split(/\s+/).filter(Boolean);
        return words.every(function (w) { return r.hay.indexOf(w) !== -1; });
    }

    function applyFilters() {
        var shown = 0;
        places.forEach(function (r) {
            var on = matchesMeals(r) && matchesQuery(r);
            if (on && !map.hasLayer(r.marker)) r.marker.addTo(map);
            if (!on && map.hasLayer(r.marker)) r.marker.remove();
            if (on) shown++;
        });
        if (selected && !map.hasLayer(selected.marker)) select(null);
        countLine.textContent = shown === places.length ? places.length + ' places'
            : shown + ' of ' + places.length + ' places';
    }

    function renderResults() {
        resultIndex = -1;
        if (!query) { results.hidden = true; results.innerHTML = ''; return; }
        var hits = places.filter(function (r) { return matchesMeals(r) && matchesQuery(r); });
        var cities = cityNames.filter(function (c) { return c.toLowerCase().indexOf(query) === 0; });
        var rows = cities.map(function (c) {
            var n = places.filter(function (r) { return r.city === c; }).length;
            return '<li role="option" class="city" data-city="' + esc(c) + '">' + esc(c) +
                '<small>City · ' + n + (n === 1 ? ' place' : ' places') + '</small></li>';
        }).concat(hits.slice(0, MAX_RESULTS).map(function (r) {
            return '<li role="option" data-i="' + places.indexOf(r) + '">' + esc(r.name) +
                '<small>' + esc([r.area, r.city].filter(Boolean).join(' · ')) + '</small></li>';
        }));
        results.innerHTML = rows.length ? rows.join('') : '<li class="empty">Nothing matches.</li>';
        results.hidden = false;
    }

    function pickResult(li) {
        results.hidden = true;
        search.blur();
        if (li.dataset.city) { showCity(li.dataset.city); return; }
        select(places[Number(li.dataset.i)], { fly: true });
    }

    // Typing a city's full name goes to that city, as if its button had been pressed
    function cityFromQuery() {
        clearTimeout(citySearchTimer);
        var hit = cityNames.find(function (c) { return c.toLowerCase() === query; });
        if (hit) citySearchTimer = setTimeout(function () { showCity(hit); }, 350);
    }

    function buildMeals() {
        var present = new Set();
        places.forEach(function (r) { (r.meal || []).forEach(function (m) { present.add(m); }); });
        MEALS.filter(function (m) { return present.has(m); }).forEach(function (m) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'rmap-chip';
            b.textContent = m.charAt(0).toUpperCase() + m.slice(1);
            b.setAttribute('aria-pressed', 'false');
            b.addEventListener('click', function () {
                if (meals.has(m)) meals.delete(m); else meals.add(m);
                b.classList.toggle('active', meals.has(m));
                b.setAttribute('aria-pressed', meals.has(m) ? 'true' : 'false');
                applyFilters();
                renderResults();
            });
            mealBar.appendChild(b);
        });
    }

    function wireSearch() {
        search.addEventListener('input', function () {
            query = search.value.trim().toLowerCase();
            applyFilters();
            renderResults();
            cityFromQuery();
        });
        search.addEventListener('focus', renderResults);
        search.addEventListener('keydown', function (e) {
            var items = results.querySelectorAll('li[data-i], li[data-city]');
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                if (!items.length) return;
                e.preventDefault();
                resultIndex = (resultIndex + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
                items.forEach(function (li, i) { li.classList.toggle('on', i === resultIndex); });
            } else if (e.key === 'Enter') {
                if (items.length) pickResult(items[Math.max(0, resultIndex)]);
            } else if (e.key === 'Escape') {
                results.hidden = true;
            }
        });
        // mousedown, so the click lands before the input's blur hides the list
        results.addEventListener('mousedown', function (e) {
            var li = e.target.closest('li[data-i], li[data-city]');
            if (li) { e.preventDefault(); pickResult(li); }
        });
        search.addEventListener('blur', function () { results.hidden = true; });
    }

    // Leave room for the floating panel (left on desktop, top on phones) when fitting pins in view
    function panelPadding() {
        var panel = document.querySelector('.rmap-panel').getBoundingClientRect();
        var wide = window.innerWidth > 576;
        return { paddingTopLeft: [wide ? panel.width + 40 : 30, wide ? 50 : panel.height + 30],
                 paddingBottomRight: [50, 50] };
    }

    function largestPolygon(geometry) {
        if (geometry.type === 'Polygon') return geometry;
        var area = function (ring) {
            var a = 0;
            for (var k = 0, n = ring.length; k < n; k++) {
                var p = ring[k], q = ring[(k + 1) % n];
                a += p[0] * q[1] - q[0] * p[1];
            }
            return Math.abs(a);
        };
        var best = geometry.coordinates.reduce(function (m, poly) { return area(poly[0]) > area(m[0]) ? poly : m; });
        return { type: 'Polygon', coordinates: best };
    }

    // A city view: its outline (if we have one) drawn, framed on its main landmass plus its pins.
    // name null means everywhere.
    function showCity(name) {
        select(null, { keepHash: true });
        cityBar.querySelectorAll('.rmap-city').forEach(function (b) {
            b.classList.toggle('active', b.dataset.city === (name ? slug(name) : ''));
        });
        if (outlineLayer) { outlineLayer.remove(); outlineLayer = null; }
        var inCity = places.filter(function (r) { return name === null || r.city === name; });
        var visible = inCity.filter(function (r) { return map.hasLayer(r.marker); });
        var bounds = L.latLngBounds((visible.length ? visible : inCity).map(function (r) { return [r.lat, r.lng]; }));
        var shape = name && outlines[name];
        if (shape) {
            outlineLayer = L.geoJSON(shape, {
                interactive: false,
                style: { color: '#dc3545', weight: 2, opacity: 0.8, dashArray: '6 5',
                         fillColor: '#dc3545', fillOpacity: 0.04 }
            }).addTo(map);
            bounds.extend(L.geoJSON(largestPolygon(shape)).getBounds());
        }
        map.flyToBounds(bounds, Object.assign({ maxZoom: 14, duration: 0.8 }, panelPadding()));
        history.replaceState(null, '', name ? '#' + slug(name) : location.pathname);
    }

    function buildCities() {
        var counts = {};
        places.forEach(function (r) { counts[r.city] = (counts[r.city] || 0) + 1; });
        cityNames = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });
        var cities = Object.keys(counts).filter(function (c) { return counts[c] >= MIN_CITY; })
            .sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });
        [null].concat(cities).forEach(function (c) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'rmap-chip rmap-city';
            b.dataset.city = c ? slug(c) : '';
            b.innerHTML = c ? esc(c) + '<span class="n">' + counts[c] + '</span>' : 'Everywhere';
            b.addEventListener('click', function () { showCity(c); });
            cityBar.appendChild(b);
        });
    }

    function openFromHash() {
        var h = decodeURIComponent(location.hash.slice(1));
        if (!h) return false;
        var r = places.find(function (p) { return p.id === h; });
        if (r) { select(r, { fly: true }); return true; }
        var c = cityNames.find(function (n) { return slug(n) === h; });
        if (c) { showCity(c); return true; }
        return false;
    }

    function init(data) {
        places = (data.restaurants || []).filter(function (r) {
            return typeof r.lat === 'number' && typeof r.lng === 'number';
        });

        places.forEach(function (r) { r.hay = haystack(r); });
        map = L.map('rmap', { zoomSnap: 0.25, worldCopyJump: true, tap: true, zoomControl: false });
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        // Stadia Maps' OSM Bright. Stadia authenticates by domain (narunraman.com is registered in the
        // Stadia account), so there is no key here; localhost works without one.
        L.tileLayer('https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png', {
            maxZoom: 20,
            attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> ' +
                         '&copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> ' +
                         '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // favourites drawn last, so they sit on top of nearby pins
        places.slice().sort(function (a, b) { return (a.topRated ? 1 : 0) - (b.topRated ? 1 : 0); })
            .forEach(function (r) {
                r.marker = L.marker([r.lat, r.lng], { icon: pinIcon(r, false), title: r.name, keyboard: true,
                                                      riseOnHover: true })
                    .on('click', function () { select(r); })
                    .addTo(map);
            });

        map.on('click', function () { select(null); });
        card.querySelector('.rmap-close').addEventListener('click', function () { select(null); });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && document.activeElement !== search) select(null);
        });

        buildMeals();
        buildCities();
        wireSearch();
        applyFilters();
        map.fitBounds(places.map(function (r) { return [r.lat, r.lng]; }), panelPadding());
        openFromHash();
        new ResizeObserver(function () { map.invalidateSize(); }).observe(stage);
    }

    // The outlines are optional: without them a city view just frames its pins
    var outlinesReady = fetch(OUTLINES_URL)
        .then(function (res) { return res.ok ? res.json() : {}; })
        .catch(function () { return {}; });

    fetch(DATA_URL, { cache: 'no-cache' })
        .then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); })
        .then(function (data) { return outlinesReady.then(function (o) { outlines = o; return data; }); })
        .then(init)
        .catch(function (err) {
            stage.innerHTML = '<p class="container" style="padding-top:1rem">Couldn\'t load the map (' +
                esc(err.message) + ').</p>';
        });
})();

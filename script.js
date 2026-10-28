'use strict';

/* ============ Configuración y estado ============ */
const API = 'https://rickandmortyapi.com/api/character';
const KEYS = { favs: 'rm:favorites', history: 'rm:history', theme: 'rm:theme' };
const MAX_HISTORY = 6;

const $ = (sel) => document.querySelector(sel);
const grid = $('#grid'), message = $('#message'), pager = $('#pager');

// Estado único de la app: la UI siempre se pinta a partir de aquí
const state = { page: 1, pages: 1, name: '', status: '', gender: '', view: 'all' };

/* ============ Helper de localStorage ============
   JSON.stringify/parse + try/catch (por si el usuario bloquea el storage o el JSON está corrupto). */
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage lleno o bloqueado */ }
  },
};

let favorites = store.get(KEYS.favs, []); // guardamos el objeto reducido, no solo el id,
                                         // así la pestaña Favoritos funciona sin llamar a la API.

/* ============ fetch() asíncrono ============
   - URLSearchParams arma la query (?page=1&name=rick&status=alive).
   - AbortController cancela la petición anterior si el usuario sigue tecleando.
   - La API responde 404 cuando no hay resultados: lo tratamos como "estado vacío", no como error. */
let controller;
async function loadCharacters() {
  if (state.view === 'favs') return renderFavorites();

  controller?.abort();
  controller = new AbortController();
  showSkeleton();

  const params = new URLSearchParams({ page: state.page });
  ['name', 'status', 'gender'].forEach((k) => state[k] && params.set(k, state[k]));

  try {
    const res = await fetch(`${API}?${params}`, { signal: controller.signal });
    if (res.status === 404) return showMessage('empty');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    state.pages = data.info.pages;
    hideMessage();
    renderCards(data.results);
    renderPager();
  } catch (err) {
    if (err.name === 'AbortError') return; // petición cancelada a propósito
    message.hidden = true;                 // aseguramos limpiar errores previos
    showMessage('error');                  // sin conexión o API caída
  }
}

/* ============ Renderizado ============ */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isFav = (id) => favorites.some((c) => c.id === id);

function cardTemplate(c) {
  const status = c.status.toLowerCase();
  const fav = isFav(c.id);
  return `
    <article class="card">
      <img src="${esc(c.image)}" alt="Retrato de ${esc(c.name)}" loading="lazy" width="300" height="300" />
      <button class="fav" data-id="${c.id}" aria-pressed="${fav}" aria-label="${fav ? 'Quitar de' : 'Añadir a'} favoritos: ${esc(c.name)}">${fav ? '♥' : '♡'}</button>
      <div class="card__body">
        <h2 class="card__name" title="${esc(c.name)}">${esc(c.name)}</h2>
        <p class="card__meta">${esc(c.species)} · ${esc(c.gender)}</p>
        <span class="badge badge--${status}">${esc(c.status)}</span>
      </div>
    </article>`;
}

function renderCards(list) {
  grid.setAttribute('aria-busy', 'false');
  grid.innerHTML = list.map(cardTemplate).join('');
}

function showSkeleton() {
  hideMessage();
  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = '<div class="skeleton"></div>'.repeat(10);
  pager.hidden = true;
}

function showMessage(type) {
  grid.innerHTML = ''; pager.hidden = true;
  message.hidden = false;
  message.className = `message message--${type}`;
  message.innerHTML = type === 'error'
    ? '<h2>No pudimos conectar con la API</h2><p>Revisa tu conexión e inténtalo de nuevo.</p><br><button class="btn" id="retryBtn">Reintentar</button>'
    : `<h2>No se encontraron personajes</h2><p>${state.view === 'favs' ? 'Aún no tienes favoritos con esos filtros.' : 'Prueba con otro nombre o cambia los filtros.'}</p>`;
}
const hideMessage = () => { message.hidden = true; };

function renderPager() {
  pager.hidden = state.pages <= 1;
  $('#pageInfo').textContent = `Página ${state.page} de ${state.pages}`;
  $('#prevBtn').disabled = state.page === 1;
  $('#nextBtn').disabled = state.page === state.pages;
}

/* ============ Favoritos (localStorage) ============ */
function toggleFavorite(id, cardEl) {
  if (isFav(id)) {
    favorites = favorites.filter((c) => c.id !== id);
  } else {
    // Leemos los datos desde el DOM de la tarjeta para no volver a pedirlos a la API
    const name = cardEl.querySelector('.card__name').textContent;
    const [species, gender] = cardEl.querySelector('.card__meta').textContent.split(' · ');
    const status = cardEl.querySelector('.badge').textContent;
    const image = cardEl.querySelector('img').src;
    favorites.push({ id, name, species, gender, status, image });
  }
  store.set(KEYS.favs, favorites);
  updateFavCount();
  state.view === 'favs' ? renderFavorites() : refreshFavButton(id);
}

function refreshFavButton(id) {
  const btn = grid.querySelector(`.fav[data-id="${id}"]`);
  if (!btn) return;
  const on = isFav(id);
  btn.setAttribute('aria-pressed', on);
  btn.textContent = on ? '♥' : '♡';
}

function renderFavorites() {
  // En esta vista los filtros y el buscador se aplican localmente
  const list = favorites.filter((c) =>
    c.name.toLowerCase().includes(state.name.toLowerCase()) &&
    (!state.status || c.status.toLowerCase() === state.status) &&
    (!state.gender || c.gender.toLowerCase() === state.gender));
  pager.hidden = true;
  if (!list.length) return showMessage('empty');
  hideMessage();
  renderCards(list);
}

const updateFavCount = () => { $('#favCount').textContent = favorites.length; };

/* ============ EXTRA: Historial de búsquedas recientes ============
   Guarda los últimos MAX_HISTORY términos en localStorage (sin duplicados, el más reciente primero).
   Se registra cuando el usuario presiona Enter o sale del input, no en cada tecla. */
function addHistory(term) {
  term = term.trim();
  if (term.length < 2) return;
  const list = store.get(KEYS.history, []).filter((t) => t.toLowerCase() !== term.toLowerCase());
  list.unshift(term);
  store.set(KEYS.history, list.slice(0, MAX_HISTORY));
  renderHistory();
}

function renderHistory() {
  const list = store.get(KEYS.history, []);
  $('#history').hidden = !list.length;
  $('#historyChips').innerHTML = list.map((t) => `<button class="chip" type="button" data-term="${esc(t)}">${esc(t)}</button>`).join('');
}

/* ============ Eventos ============ */
const debounce = (fn, ms = 400) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

function applyFilters(patch) {
  Object.assign(state, patch, { page: 1 });
  loadCharacters();
}

// Búsqueda en tiempo real (con debounce para no saturar la API)
const searchInput = $('#searchInput');
searchInput.addEventListener('input', debounce((e) => applyFilters({ name: e.target.value.trim() })));
searchInput.addEventListener('keydown', (e) => e.key === 'Enter' && addHistory(searchInput.value));
searchInput.addEventListener('blur', () => addHistory(searchInput.value));

// Chips del historial: rellenan el input y lanzan la búsqueda
$('#historyChips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  searchInput.value = chip.dataset.term;
  applyFilters({ name: chip.dataset.term });
});
$('#clearHistory').addEventListener('click', () => { store.set(KEYS.history, []); renderHistory(); });

// Segment controls (estado y vista): un helper para ambos
function bindSegment(selector, onPick) {
  $(selector).addEventListener('click', (e) => {
    const btn = e.target.closest('.segment__btn');
    if (!btn || btn.id === 'themeToggle') return; // Evita interferir con el botón de tema
    $(selector).querySelectorAll('.segment__btn:not(#themeToggle)').forEach((b) => {
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-pressed', b === btn);
    });
    onPick(btn.dataset);
  });
}
bindSegment('#statusSeg', (d) => applyFilters({ status: d.status }));
bindSegment('#viewSeg', (d) => {
  if (d.view) applyFilters({ view: d.view });
});

$('#genderSelect').addEventListener('change', (e) => applyFilters({ gender: e.target.value }));

// Delegación de eventos: un solo listener para todos los botones de favorito
grid.addEventListener('click', (e) => {
  const btn = e.target.closest('.fav');
  if (btn) toggleFavorite(Number(btn.dataset.id), btn.closest('.card'));
});

$('#prevBtn').addEventListener('click', () => { state.page--; loadCharacters(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
$('#nextBtn').addEventListener('click', () => { state.page++; loadCharacters(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
message.addEventListener('click', (e) => e.target.id === 'retryBtn' && loadCharacters());

/* ============ Modo Oscuro / Claro (Reto Extra) ============ */
const themeToggleBtn = $('#themeToggle');
const savedTheme = store.get(KEYS.theme, 'light');

if (savedTheme === 'dark') {
  document.body.classList.add('dark-mode');
  if (themeToggleBtn) themeToggleBtn.textContent = '☀️';
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-mode');
    themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
    store.set(KEYS.theme, isDark ? 'dark' : 'light');
  });
}

/* ============ Init ============ */
updateFavCount();
renderHistory();
loadCharacters();

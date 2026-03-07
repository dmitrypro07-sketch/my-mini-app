// ══════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ TELEGRAM WEB APP
// ══════════════════════════════════════════════════════════

const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();    // сигнализируем Telegram, что приложение загружено
  tg.expand();   // разворачиваем на весь экран

  // Применяем тему при загрузке
  applyTheme();

  // Следим за сменой темы (пользователь переключил в Telegram)
  tg.onEvent('themeChanged', applyTheme);

  // Единый обработчик BackButton — управляется через updateBackButton()
  tg.BackButton.onClick(handleBack);
}

// Применяем тёмную/светлую тему через CSS-класс на body
function applyTheme() {
  if (!tg) return;
  document.body.classList.toggle('dark', tg.colorScheme === 'dark');
}


// ══════════════════════════════════════════════════════════
// УПРАВЛЕНИЕ ЭКРАНАМИ
// ══════════════════════════════════════════════════════════

let activeScreen = 'catalog'; // текущий активный экран
let sheetOpen    = false;      // открыта ли шторка

// Переключить экран (catalog | success)
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${id}`).classList.add('active');
  activeScreen = id;
  updateBackButton();
}

// Экран Success: заполняем название купленного ассистента и показываем экран
function showSuccess(assistant) {
  document.getElementById('success-product-name').textContent = `${assistant.title} активирован`;
  showScreen('success');

  // MainButton на экране Success → переход к боту
  if (tg?.MainButton) {
    tg.MainButton.setText('Перейти к ассистенту →');
    tg.MainButton.show();
    tg.MainButton.onClick(goToBot);
  }
}

// Переход к боту (Success screen)
function goToBot() {
  openLink(BOT_URL);
}


// ══════════════════════════════════════════════════════════
// BACKBUTTON — единый обработчик
// ══════════════════════════════════════════════════════════

function handleBack() {
  if (sheetOpen) {
    closeSheet();             // закрыть шторку
  } else if (activeScreen !== 'catalog') {
    showScreen('catalog');    // вернуться на каталог с любого экрана
  }
}

// Показать/скрыть BackButton в зависимости от состояния
function updateBackButton() {
  if (!tg?.BackButton) return;
  if (sheetOpen || activeScreen !== 'catalog') {
    tg.BackButton.show();
  } else {
    tg.BackButton.hide();
  }
}


// ══════════════════════════════════════════════════════════
// ФИЛЬТРЫ ПО КАТЕГОРИЯМ
// ══════════════════════════════════════════════════════════

let activeCategory = 'Все';

function renderFilters() {
  const container = document.getElementById('filters');
  container.innerHTML = categories.map(cat => `
    <button
      class="chip ${cat === activeCategory ? 'active' : ''}"
      onclick="selectCategory('${cat}')"
    >${cat}</button>
  `).join('');
}

function selectCategory(cat) {
  if (cat === activeCategory) return; // не перерендериваем зря

  activeCategory = cat;

  // Тактильный отклик при смене категории
  tg?.HapticFeedback?.selectionChanged();

  renderFilters();
  renderCatalog();
}


// ══════════════════════════════════════════════════════════
// КАТАЛОГ — рендер карточек
// ══════════════════════════════════════════════════════════

function renderCatalog() {
  const list = activeCategory === 'Все'
    ? assistants
    : assistants.filter(a => a.tag === activeCategory);

  const container = document.getElementById('catalog');

  if (list.length === 0) {
    container.innerHTML = `
      <div class="catalog-empty">
        <span class="catalog-empty-icon">🔍</span>
        В этой категории пока нет ассистентов
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(a => `
    <div class="card" onclick="openSheet(${a.id})">

      <!-- Фото слева + название поверх -->
      <div class="card-image">
        ${a.image ? `<img src="${a.image}" alt="${a.title}" loading="lazy" />` : ''}
        ${a.badge ? `<div class="card-badge ${a.badge.toLowerCase()}">${a.badge}</div>` : ''}
        <div class="card-title-overlay">${a.title}</div>
      </div>

      <!-- Контент справа -->
      <div class="card-content">
        <div class="card-desc">${a.desc}</div>
        <div class="card-footer">
          <span class="card-price">${formatPrice(a.price)}</span>
          <span class="card-tag">${a.tag}</span>
        </div>
      </div>

    </div>
  `).join('');
}

// Форматирование цены: 19900 → "19 900 ₽"
function formatPrice(price) {
  return price.toLocaleString('ru-RU') + ' ₽';
}


// ══════════════════════════════════════════════════════════
// ШТОРКА (детали ассистента)
// ══════════════════════════════════════════════════════════

let currentAssistant = null;

function openSheet(id) {
  currentAssistant = assistants.find(a => a.id === id);
  if (!currentAssistant) return;

  const a = currentAssistant;
  const hasPayUrl = !!a.payUrl;
  const btnText   = hasPayUrl ? `Купить за ${formatPrice(a.price)}` : 'Написать нам';

  // Тактильный отклик при открытии карточки
  tg?.HapticFeedback?.impactOccurred('light');

  // Наполняем шторку контентом
  document.getElementById('sheet-body').innerHTML = `
    ${a.image ? `<div class="sheet-hero"><img src="${a.image}" alt="${a.title}" /></div>` : ''}
    <div class="sheet-content">
      <span class="sheet-icon">${a.icon}</span>
      <div class="sheet-title">${a.title}</div>
      <div class="sheet-tagline">${a.tagline}</div>

      <div class="sheet-section">
        <div class="sheet-section-title">Что вы получите</div>
        <ul class="sheet-list">
          ${a.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>

      ${a.proof ? `<div class="sheet-proof">${a.proof}</div>` : ''}

      <div class="sheet-price">${formatPrice(a.price)}</div>
      <div class="sheet-price-note">единоразовая оплата, навсегда</div>
    </div>
  `;

  // Кнопка-фоллбэк
  document.getElementById('sheet-btn').textContent = btnText;

  // Показываем оверлей и шторку с анимацией
  document.getElementById('sheet-overlay').classList.remove('hidden');
  requestAnimationFrame(() => {
    document.getElementById('sheet').classList.add('open');
  });

  sheetOpen = true;
  updateBackButton();

  // MainButton Telegram
  if (tg?.MainButton) {
    tg.MainButton.setText(btnText);
    tg.MainButton.show();
    tg.MainButton.onClick(handleBuy);
  }
}

function closeSheet() {
  // Убираем анимацию шторки
  document.getElementById('sheet').classList.remove('open');

  // Скрываем оверлей чуть позже — чтобы дождаться анимации
  setTimeout(() => {
    document.getElementById('sheet-overlay').classList.add('hidden');
  }, 300);

  sheetOpen = false;
  currentAssistant = null;
  updateBackButton();

  // Скрываем MainButton
  if (tg?.MainButton) {
    tg.MainButton.hide();
    tg.MainButton.offClick(handleBuy);
  }
}


// ══════════════════════════════════════════════════════════
// ОБРАБОТКА ПОКУПКИ
// ══════════════════════════════════════════════════════════

function handleBuy() {
  if (!currentAssistant) return;

  // Тактильный отклик — чуть сильнее, чем при открытии карточки
  tg?.HapticFeedback?.impactOccurred('medium');

  if (currentAssistant.payUrl) {
    // Есть ссылка оплаты — открываем платёжную страницу
    openLink(currentAssistant.payUrl);
    // Показываем Success сразу (в production — после webhook от платёжного сервиса)
    const bought = currentAssistant;
    closeSheet();
    showSuccess(bought);
  } else {
    // Ссылки нет — пишем менеджеру
    openLink(CONTACT_URL);
    closeSheet();
  }
}

// Открытие ссылки: через tg.openLink в Telegram, иначе window.open
function openLink(url) {
  if (tg?.openLink) {
    tg.openLink(url);
  } else {
    window.open(url, '_blank');
  }
}


// ══════════════════════════════════════════════════════════
// SWIPE-TO-CLOSE (свайп вниз закрывает шторку)
// Инициализируется один раз — не привязываем к каждому openSheet
// ══════════════════════════════════════════════════════════

(function initSwipe() {
  const sheetEl    = document.getElementById('sheet');
  const sheetBody  = document.getElementById('sheet-body');
  let touchStartY  = 0;

  sheetEl.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  sheetEl.addEventListener('touchend', e => {
    const delta = e.changedTouches[0].clientY - touchStartY;
    // Закрываем если: свайп > 80px вниз И список не прокручен (мы вверху)
    if (delta > 80 && sheetBody.scrollTop === 0) {
      closeSheet();
    }
  }, { passive: true });
})();


// ══════════════════════════════════════════════════════════
// ЗАПУСК ПРИЛОЖЕНИЯ
// ══════════════════════════════════════════════════════════

renderFilters();
renderCatalog();

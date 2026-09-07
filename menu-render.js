/* ============================================================
   menu-render.js — renders menu items from /api/menu into the
   page's [data-category] container, then re-polls periodically
   so sold-out/price edits made in the admin page show up on an
   already-open tab without a reload or redeploy.

   Must be loaded BEFORE app.js. Relies on window.MaximusApp
   (from app.js) only inside async callbacks, by which point
   app.js has already executed and defined it.
   ============================================================ */
(function () {
  const POLL_MS = 45000;

  function formatPrice(price) {
    return '₦' + Number(price).toLocaleString('en-NG');
  }

  function buildCard(item) {
    const card = document.createElement('div');
    card.className = 'food-card';
    card.dataset.itemId = item.id;
    if (item.soldOut) card.classList.add('sold-out');

    const img = document.createElement('img');
    img.src = item.image || '';
    img.alt = item.name;
    card.appendChild(img);

    const info = document.createElement('div');
    info.className = 'food-info';

    const name = document.createElement('h4');
    name.textContent = item.name;
    info.appendChild(name);

    const price = document.createElement('p');
    price.className = 'item-price';
    price.textContent = formatPrice(item.price);
    info.appendChild(price);

    if (item.note) {
      const note = document.createElement('small');
      note.style.cssText = 'display:block;color:#ccc;margin-top:4px;';
      note.textContent = item.note;
      info.appendChild(note);
    }

    if (item.soldOut) {
      const badge = document.createElement('span');
      badge.className = 'sold-out-badge';
      badge.textContent = 'Sold Out';
      card.appendChild(badge);
    }

    card.appendChild(info);
    return card;
  }

  function buildListItem(item) {
    const row = document.createElement('div');
    row.className = 'food-list-item';
    row.dataset.itemId = item.id;
    if (item.soldOut) row.classList.add('sold-out');

    const name = document.createElement('h4');
    name.textContent = item.name;
    row.appendChild(name);

    const price = document.createElement('p');
    price.className = 'item-price';
    price.textContent = item.soldOut ? 'Sold Out' : formatPrice(item.price);
    row.appendChild(price);

    if (item.note) {
      const note = document.createElement('small');
      note.style.cssText = 'display:block;color:#ccc;margin-top:4px;';
      note.textContent = item.note;
      row.appendChild(note);
    }

    return row;
  }

  function renderItems(container, items, layout) {
    container.innerHTML = '';
    const build = layout === 'list' ? buildListItem : buildCard;
    items.forEach((item) => container.appendChild(build(item)));
    if (window.MaximusApp) window.MaximusApp.enhanceCards(container);
  }

  function updateItems(container, items, layout) {
    let structureChanged = false;

    items.forEach((item) => {
      const node = container.querySelector(`[data-item-id="${CSS.escape(item.id)}"]`);
      if (!node) { structureChanged = true; return; }

      node.classList.toggle('sold-out', !!item.soldOut);
      const priceEl = node.querySelector('.item-price');
      if (priceEl) {
        priceEl.textContent = (layout === 'list' && item.soldOut)
          ? 'Sold Out'
          : formatPrice(item.price);
      }

      const badge = node.querySelector('.sold-out-badge');
      if (item.soldOut && !badge && layout !== 'list') {
        const b = document.createElement('span');
        b.className = 'sold-out-badge';
        b.textContent = 'Sold Out';
        node.appendChild(b);
      } else if (!item.soldOut && badge) {
        badge.remove();
      }
    });

    // Item count changed (added/removed in admin) -- fall back to a full render.
    if (structureChanged || container.children.length !== items.length) {
      renderItems(container, items, layout);
    }
  }

  function resolveFeaturedItems(data) {
    return (data.featured || [])
      .map((id) => {
        const [categorySlug] = id.split('/');
        return data.categories?.[categorySlug]?.items?.find((i) => i.id === id);
      })
      .filter(Boolean);
  }

  function render(container, data, isUpdate) {
    const slug = container.dataset.category;
    const isFeatured = slug === 'featured';
    const category = isFeatured ? { layout: 'grid' } : data.categories?.[slug];

    if (!category) return;

    const items = isFeatured ? resolveFeaturedItems(data) : (category.items || []);
    const layout = category.layout || 'grid';

    if (isUpdate) {
      updateItems(container, items, layout);
    } else {
      renderItems(container, items, layout);
    }
  }

  async function tick(container, isUpdate) {
    try {
      const res = await fetch('/api/menu', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      render(container, data, isUpdate);
    } catch {
      // Network hiccup -- keep showing whatever was last rendered.
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('[data-category]');
    if (!container) return;

    tick(container, false).then(() => {
      setInterval(() => tick(container, true), POLL_MS);
    });
  });
})();

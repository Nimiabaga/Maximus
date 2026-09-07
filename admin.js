(function () {
  const loginView = document.getElementById('login-view');
  const editorView = document.getElementById('editor-view');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const categoriesEl = document.getElementById('admin-categories');
  const statusEl = document.getElementById('admin-status');
  const logoutBtn = document.getElementById('logout-btn');

  function formatPrice(price) {
    return '₦' + Number(price).toLocaleString('en-NG');
  }

  function showEditor() {
    loginView.hidden = true;
    editorView.hidden = false;
  }

  function showLogin() {
    loginView.hidden = false;
    editorView.hidden = true;
  }

  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.style.color = isError ? '#ff6666' : '#8fdc8f';
    if (text) setTimeout(() => { if (statusEl.textContent === text) statusEl.textContent = ''; }, 3000);
  }

  function renderCategories(data) {
    categoriesEl.innerHTML = '';
    const categories = data.categories || {};

    Object.keys(categories).sort().forEach((slug) => {
      const category = categories[slug];
      const section = document.createElement('section');
      section.className = 'admin-category';

      const heading = document.createElement('h3');
      heading.textContent = category.label || slug;
      section.appendChild(heading);

      const list = document.createElement('div');
      list.className = 'admin-item-list';

      (category.items || []).forEach((item) => {
        list.appendChild(renderRow(slug, item));
      });

      section.appendChild(list);
      categoriesEl.appendChild(section);
    });
  }

  function renderRow(categorySlug, item) {
    const row = document.createElement('div');
    row.className = 'admin-item-row';

    const name = document.createElement('span');
    name.className = 'admin-item-name';
    name.textContent = item.name;
    row.appendChild(name);

    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.min = '0';
    priceInput.step = '1';
    priceInput.value = item.price;
    priceInput.className = 'admin-price-input';
    row.appendChild(priceInput);

    const soldOutLabel = document.createElement('label');
    soldOutLabel.className = 'admin-soldout-label';
    const soldOutCheckbox = document.createElement('input');
    soldOutCheckbox.type = 'checkbox';
    soldOutCheckbox.checked = !!item.soldOut;
    soldOutLabel.appendChild(soldOutCheckbox);
    soldOutLabel.appendChild(document.createTextNode(' Sold out'));
    row.appendChild(soldOutLabel);

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      const price = Math.round(Number(priceInput.value));
      const soldOut = soldOutCheckbox.checked;

      try {
        const res = await fetch('/api/admin/menu', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categorySlug, itemId: item.id, changes: { price, soldOut } }),
        });

        if (res.status === 401) { showLogin(); return; }
        if (!res.ok) throw new Error();

        priceInput.value = price;
        setStatus(`Saved ${item.name}`, false);
      } catch {
        setStatus(`Failed to save ${item.name}`, true);
      } finally {
        saveBtn.disabled = false;
      }
    });
    row.appendChild(saveBtn);

    return row;
  }

  async function loadEditor() {
    const res = await fetch('/api/admin/menu');
    if (res.status === 401) { showLogin(); return; }
    if (!res.ok) { setStatus('Failed to load menu', true); return; }

    const data = await res.json();
    renderCategories(data);
    showEditor();
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    const passcode = document.getElementById('passcode').value;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        loginError.textContent = body.error || 'Login failed';
        loginError.hidden = false;
        return;
      }

      loginForm.reset();
      await loadEditor();
    } catch {
      loginError.textContent = 'Login failed';
      loginError.hidden = false;
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' }).catch(() => {});
    showLogin();
  });

  loadEditor();
})();

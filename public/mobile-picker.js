// Keep the native select as the form value; phones get a shorter, branded choice sheet.
const phone = matchMedia('(max-width: 639px)');
let activeTrigger;
const synchronizers = new WeakMap();

export function syncMobilePicker(select) { synchronizers.get(select)?.(); }

function labelFor(select) {
  const label = document.querySelector(`label[for="${CSS.escape(select.id)}"]`)?.cloneNode(true);
  label?.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove());
  return label?.textContent.trim() || 'เลือกตัวเลือก';
}

function choices(select) {
  return [...select.children].flatMap(child => child.tagName === 'OPTGROUP'
    ? [{ heading: child.label }, ...[...child.children].map(option => ({ option }))]
    : [{ option: child }]);
}

export function installMobilePickers() {
  const sheet = document.createElement('dialog');
  sheet.className = 'mobile-picker-dialog';
  sheet.setAttribute('aria-labelledby', 'mobile-picker-title');
  document.body.append(sheet);

  const close = () => { if (sheet.open) sheet.close(); };
  sheet.addEventListener('close', () => { activeTrigger?.focus({ preventScroll: true }); activeTrigger = null; });
  sheet.addEventListener('click', event => { if (event.target === sheet) close(); });
  phone.addEventListener('change', () => {
    if (!phone.matches) close();
    document.querySelectorAll('select.mobile-picker-native').forEach(setMode);
  });

  function setMode(select) {
    if (phone.matches) {
      select.tabIndex = -1;
      select.setAttribute('aria-hidden', 'true');
      if (document.activeElement === select) select.nextElementSibling?.focus({ preventScroll: true });
    } else {
      select.removeAttribute('tabindex');
      select.removeAttribute('aria-hidden');
    }
  }

  function enhance(select) {
    if (select.dataset.mobilePicker || !select.id) return;
    select.dataset.mobilePicker = 'true';
    select.classList.add('mobile-picker-native');
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'mobile-picker-trigger';
    trigger.id = `${select.id}-mobile`;
    trigger.setAttribute('aria-haspopup', 'dialog');
    if (select.hasAttribute('aria-describedby')) trigger.setAttribute('aria-describedby', select.getAttribute('aria-describedby'));
    const sync = () => {
      trigger.textContent = select.selectedOptions[0]?.textContent.trim() || 'เลือกตัวเลือก';
      trigger.disabled = select.disabled;
      trigger.setAttribute('aria-label', `${labelFor(select)}: ${trigger.textContent}`);
    };
    synchronizers.set(select, sync);
    select.after(trigger);
    setMode(select);
    select.addEventListener('change', sync);
    select.form?.addEventListener('reset', () => queueMicrotask(sync));
    select.addEventListener('invalid', event => {
      if (!phone.matches) return;
      event.preventDefault();
      trigger.click();
    });
    document.querySelector(`label[for="${CSS.escape(select.id)}"]`)?.addEventListener('click', event => {
      if (!phone.matches) return;
      event.preventDefault();
      trigger.click();
    });
    trigger.addEventListener('click', () => {
      if (!phone.matches) { select.focus(); return; }
      activeTrigger = trigger;
      const title = labelFor(select);
      sheet.replaceChildren();
      const heading = document.createElement('h2');
      heading.id = 'mobile-picker-title';
      heading.textContent = title;
      const dismiss = document.createElement('button');
      dismiss.type = 'button';
      dismiss.className = 'mobile-picker-close';
      dismiss.textContent = 'ปิด';
      dismiss.addEventListener('click', close);
      const header = document.createElement('div');
      header.className = 'mobile-picker-head';
      header.append(heading, dismiss);
      const list = document.createElement('div');
      list.className = 'mobile-picker-options';
      choices(select).forEach(item => {
        if (item.heading) {
          const group = document.createElement('h3');
          group.textContent = item.heading;
          list.append(group);
          return;
        }
        const option = item.option;
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = option.textContent.trim();
        button.disabled = option.disabled || option.parentElement?.disabled;
        button.setAttribute('aria-pressed', String(option.value === select.value));
        button.addEventListener('click', () => {
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          close();
        });
        list.append(button);
      });
      sheet.append(header, list);
      sheet.showModal();
    });
    sync();
  }

  const scan = root => {
    if (root.nodeType !== 1) return;
    if (root.matches?.('select')) enhance(root);
    root.querySelectorAll?.('select').forEach(enhance);
  };
  scan(document.body);
  new MutationObserver(records => records.forEach(record => {
    if(record.type==='attributes')syncMobilePicker(record.target.closest('select'));
    else { record.addedNodes.forEach(scan); syncMobilePicker(record.target.closest?.('select')); }
  }))
    .observe(document.body, { childList: true, subtree: true, attributes:true, attributeFilter:['disabled','selected','label'] });
}

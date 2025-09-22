(() => {
  'use strict';

  const STORAGE_KEY = 'gestor_boletas_state_v1';

  const elements = {
    contributorForm: document.getElementById('contributor-form'),
    contributorId: document.getElementById('contributor-id'),
    contributorClient: document.getElementById('contributor-client'),
    contributorName: document.getElementById('contributor-name'),
    contributorAddress: document.getElementById('contributor-address'),
    contributorMeters: document.getElementById('contributor-meters'),
    contributorRate: document.getElementById('contributor-rate'),
    contributorSamco: document.getElementById('contributor-samco'),
    contributorExtra1Label: document.getElementById('contributor-extra1-label'),
    contributorExtra1Amount: document.getElementById('contributor-extra1-amount'),
    contributorExtra2Label: document.getElementById('contributor-extra2-label'),
    contributorExtra2Amount: document.getElementById('contributor-extra2-amount'),
    contributorRetired: document.getElementById('contributor-retired'),
    contributorCancel: document.getElementById('contributor-cancel'),
    contributorFeedback: document.getElementById('contributor-feedback'),
    contributorsTableBody: document.querySelector('#contributors-table tbody'),
    paymentForm: document.getElementById('payment-form'),
    paymentContributor: document.getElementById('payment-contributor'),
    paymentDate: document.getElementById('payment-date'),
    paymentAmount: document.getElementById('payment-amount'),
    paymentMethod: document.getElementById('payment-method'),
    paymentNotes: document.getElementById('payment-notes'),
    paymentFeedback: document.getElementById('payment-feedback'),
    paymentsTableBody: document.querySelector('#payments-table tbody'),
    boletaForm: document.getElementById('boleta-form'),
    boletaContributor: document.getElementById('boleta-contributor'),
    boletaMonth: document.getElementById('boleta-month'),
    boletaYear: document.getElementById('boleta-year'),
    boletaDueDate: document.getElementById('boleta-due-date'),
    boletaMeters: document.getElementById('boleta-meters'),
    boletaRate: document.getElementById('boleta-rate'),
    boletaSamco: document.getElementById('boleta-samco'),
    boletaExtra1Label: document.getElementById('boleta-extra1-label'),
    boletaExtra1Amount: document.getElementById('boleta-extra1-amount'),
    boletaExtra2Label: document.getElementById('boleta-extra2-label'),
    boletaExtra2Amount: document.getElementById('boleta-extra2-amount'),
    boletaRetired: document.getElementById('boleta-retired'),
    boletaFeedback: document.getElementById('boleta-feedback'),
    previewCard: document.getElementById('preview-section'),
    previewArticle: document.getElementById('boleta-preview'),
    previewPlaceholder: document.getElementById('boleta-empty'),
    barcodeCanvases: Array.from(document.querySelectorAll('.barcode-canvas')),
    printButton: document.getElementById('print-button'),
    resetButton: document.getElementById('reset-storage-button')
  };

  const state = loadState();

  initialize();

  function defaultState() {
    return {
      contributors: [],
      payments: []
    };
  }

  function loadState() {
    if (typeof localStorage === 'undefined') {
      return defaultState();
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return defaultState();
      }
      const parsed = JSON.parse(raw);
      return {
        contributors: Array.isArray(parsed.contributors) ? parsed.contributors : [],
        payments: Array.isArray(parsed.payments) ? parsed.payments : []
      };
    } catch (error) {
      console.error('No se pudo leer la base local, se iniciará vacía.', error);
      return defaultState();
    }
  }

  function persistState() {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function initialize() {
    configureDefaultDates();
    bindEvents();
    renderContributors();
    renderPayments();
    refreshContributorOptions();
    updateBoletaPreview();
  }

  function configureDefaultDates() {
    const today = new Date();
    elements.boletaMonth.value = String(today.getMonth() + 1);
    elements.boletaYear.value = today.getFullYear();
    const defaultDue = new Date(today.getFullYear(), today.getMonth(), 10);
    elements.boletaDueDate.value = formatForInput(defaultDue);
    elements.paymentDate.value = formatForInput(today);
  }

  function bindEvents() {
    elements.contributorForm.addEventListener('submit', handleContributorSubmit);
    elements.contributorCancel.addEventListener('click', clearContributorForm);

    elements.paymentForm.addEventListener('submit', handlePaymentSubmit);

    elements.boletaForm.addEventListener('submit', event => {
      event.preventDefault();
      updateBoletaPreview(true);
    });
    elements.boletaForm.addEventListener('input', () => updateBoletaPreview());
    elements.boletaForm.addEventListener('change', () => updateBoletaPreview());
    elements.boletaContributor.addEventListener('change', handleBoletaContributorChange);

    elements.printButton.addEventListener('click', () => {
      if (elements.previewArticle.hasAttribute('hidden')) {
        elements.boletaFeedback.textContent = 'Genere una boleta antes de intentar imprimir.';
        return;
      }
      window.print();
    });

    elements.resetButton.addEventListener('click', () => {
      const confirmed = window.confirm(
        'Se eliminarán los contribuyentes, pagos y configuraciones guardados en este navegador. ¿Desea continuar?'
      );
      if (confirmed && typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
      }
    });
  }

  function handleContributorSubmit(event) {
    event.preventDefault();
    const form = elements.contributorForm;

    if (!form.reportValidity()) {
      elements.contributorFeedback.textContent = 'Revise los campos obligatorios antes de guardar.';
      return;
    }

    const contributor = {
      id: elements.contributorId.value || createId(),
      clientNumber: elements.contributorClient.value.trim(),
      fullName: elements.contributorName.value.trim(),
      address: elements.contributorAddress.value.trim(),
      frontMeters: toNumber(elements.contributorMeters.value),
      ratePerMeter: toNumber(elements.contributorRate.value),
      samcoContribution: toNumber(elements.contributorSamco.value),
      extraServices: [
        {
          label: elements.contributorExtra1Label.value.trim(),
          amount: toNumber(elements.contributorExtra1Amount.value)
        },
        {
          label: elements.contributorExtra2Label.value.trim(),
          amount: toNumber(elements.contributorExtra2Amount.value)
        }
      ],
      retiredDiscountPercent: clamp(toNumber(elements.contributorRetired.value), 0, 100)
    };

    const existingIndex = state.contributors.findIndex(item => item.id === contributor.id);
    if (existingIndex >= 0) {
      state.contributors.splice(existingIndex, 1, contributor);
      elements.contributorFeedback.textContent = 'Contribuyente actualizado correctamente.';
    } else {
      state.contributors.push(contributor);
      elements.contributorFeedback.textContent = 'Contribuyente agregado al padrón.';
    }

    state.contributors.sort((a, b) => a.clientNumber.localeCompare(b.clientNumber, 'es')); // orden por número
    persistState();
    renderContributors();
    refreshContributorOptions();
    synchronizeBoletaContributor(contributor.id);
    clearContributorForm();
  }

  function handleContributorEdit(id) {
    const contributor = state.contributors.find(item => item.id === id);
    if (!contributor) return;

    elements.contributorId.value = contributor.id;
    elements.contributorClient.value = contributor.clientNumber;
    elements.contributorName.value = contributor.fullName;
    elements.contributorAddress.value = contributor.address;
    elements.contributorMeters.value = contributor.frontMeters;
    elements.contributorRate.value = contributor.ratePerMeter;
    elements.contributorSamco.value = contributor.samcoContribution;
    elements.contributorExtra1Label.value = contributor.extraServices[0]?.label || '';
    elements.contributorExtra1Amount.value = contributor.extraServices[0]?.amount ?? '';
    elements.contributorExtra2Label.value = contributor.extraServices[1]?.label || '';
    elements.contributorExtra2Amount.value = contributor.extraServices[1]?.amount ?? '';
    elements.contributorRetired.value = contributor.retiredDiscountPercent ?? '';
    elements.contributorFeedback.textContent = 'Editando contribuyente existente. Realice los cambios y guarde.';
    elements.contributorClient.focus();
  }

  function handleContributorDelete(id) {
    const contributor = state.contributors.find(item => item.id === id);
    if (!contributor) return;

    const confirmed = window.confirm(
      `Se eliminará el contribuyente ${contributor.fullName} y sus pagos asociados. ¿Desea continuar?`
    );

    if (!confirmed) {
      return;
    }

    state.contributors = state.contributors.filter(item => item.id !== id);
    state.payments = state.payments.filter(item => item.contributorId !== id);
    persistState();
    renderContributors();
    renderPayments();
    refreshContributorOptions();
    if (elements.boletaContributor.value === id) {
      elements.boletaContributor.value = '';
    }
    updateBoletaPreview();
  }

  function clearContributorForm() {
    elements.contributorForm.reset();
    elements.contributorId.value = '';
    elements.contributorFeedback.textContent = '';
  }

  function renderContributors() {
    const tbody = elements.contributorsTableBody;
    tbody.innerHTML = '';

    if (state.contributors.length === 0) {
      const row = document.createElement('tr');
      row.className = 'empty';
      const cell = document.createElement('td');
      cell.colSpan = 10;
      cell.textContent = 'Todavía no hay contribuyentes cargados.';
      row.append(cell);
      tbody.append(row);
      return;
    }

    for (const contributor of state.contributors) {
      const baseAmount = contributor.frontMeters * contributor.ratePerMeter;
      const row = document.createElement('tr');

      row.innerHTML = `
        <td>${escapeHtml(contributor.clientNumber)}</td>
        <td>${escapeHtml(contributor.fullName)}</td>
        <td>${escapeHtml(contributor.address)}</td>
        <td>${formatMeters(contributor.frontMeters)}</td>
        <td>${formatCurrency(contributor.ratePerMeter)}</td>
        <td>${formatCurrency(baseAmount)}</td>
        <td>${formatCurrency(contributor.samcoContribution)}</td>
        <td>${formatExtrasSummary(contributor.extraServices)}</td>
        <td>${formatPercent(contributor.retiredDiscountPercent)}</td>
        <td class="actions-col">
          <div class="table-actions">
            <button type="button" class="secondary" data-action="edit">Editar</button>
            <button type="button" class="danger" data-action="delete">Eliminar</button>
          </div>
        </td>
      `;

      row.querySelector('[data-action="edit"]').addEventListener('click', () => handleContributorEdit(contributor.id));
      row.querySelector('[data-action="delete"]').addEventListener('click', () => handleContributorDelete(contributor.id));

      tbody.append(row);
    }
  }

  function formatExtrasSummary(extraServices) {
    if (!Array.isArray(extraServices)) {
      return '—';
    }

    const summary = extraServices
      .filter(service => service && service.label && service.amount)
      .map(service => `${escapeHtml(service.label)} (${formatCurrency(service.amount)})`);

    return summary.length ? summary.join('<br/>') : '—';
  }

  function handlePaymentSubmit(event) {
    event.preventDefault();
    const form = elements.paymentForm;

    if (!form.reportValidity()) {
      elements.paymentFeedback.textContent = 'Complete los campos obligatorios antes de registrar el pago.';
      return;
    }

    const contributorId = elements.paymentContributor.value;
    const contributor = state.contributors.find(item => item.id === contributorId);

    if (!contributor) {
      elements.paymentFeedback.textContent = 'Seleccione un contribuyente válido.';
      return;
    }

    const payment = {
      id: createId(),
      contributorId,
      date: elements.paymentDate.value,
      amount: toNumber(elements.paymentAmount.value),
      method: elements.paymentMethod.value.trim(),
      notes: elements.paymentNotes.value.trim()
    };

    state.payments.push(payment);
    state.payments.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    persistState();
    renderPayments();
    elements.paymentFeedback.textContent = 'Pago registrado correctamente.';
    form.reset();
    refreshContributorOptions();
    const today = new Date();
    elements.paymentDate.value = formatForInput(today);
  }

  function handlePaymentDelete(id) {
    const payment = state.payments.find(item => item.id === id);
    if (!payment) return;

    const contributor = state.contributors.find(item => item.id === payment.contributorId);
    const contributorName = contributor ? contributor.fullName : 'contribuyente';

    const confirmed = window.confirm(
      `¿Eliminar el pago registrado para ${contributorName} del ${formatDate(payment.date)}?`
    );

    if (!confirmed) {
      return;
    }

    state.payments = state.payments.filter(item => item.id !== id);
    persistState();
    renderPayments();
  }

  function renderPayments() {
    const tbody = elements.paymentsTableBody;
    tbody.innerHTML = '';

    if (state.payments.length === 0) {
      const row = document.createElement('tr');
      row.className = 'empty';
      const cell = document.createElement('td');
      cell.colSpan = 6;
      cell.textContent = 'Sin pagos registrados hasta el momento.';
      row.append(cell);
      tbody.append(row);
      return;
    }

    for (const payment of state.payments) {
      const contributor = state.contributors.find(item => item.id === payment.contributorId);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${formatDate(payment.date)}</td>
        <td>${escapeHtml(contributor ? contributor.fullName : '—')}</td>
        <td>${formatCurrency(payment.amount)}</td>
        <td>${escapeHtml(payment.method || '—')}</td>
        <td>${escapeHtml(payment.notes || '')}</td>
        <td class="actions-col">
          <div class="table-actions">
            <button type="button" class="danger" data-action="delete">Eliminar</button>
          </div>
        </td>
      `;

      row.querySelector('[data-action="delete"]').addEventListener('click', () => handlePaymentDelete(payment.id));
      tbody.append(row);
    }
  }

  function refreshContributorOptions() {
    const selects = [elements.paymentContributor, elements.boletaContributor];
    const previousSelections = selects.map(select => select.value);

    for (const select of selects) {
      select.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Seleccione...';
      select.append(placeholder);

      for (const contributor of state.contributors) {
        const option = document.createElement('option');
        option.value = contributor.id;
        option.textContent = `${contributor.clientNumber} — ${contributor.fullName}`;
        select.append(option);
      }
    }

    selects.forEach((select, index) => {
      const previous = previousSelections[index];
      if (previous && Array.from(select.options).some(option => option.value === previous)) {
        select.value = previous;
      }
    });
  }

  function handleBoletaContributorChange() {
    const contributorId = elements.boletaContributor.value;
    const contributor = state.contributors.find(item => item.id === contributorId);

    if (!contributor) {
      elements.boletaMeters.value = '';
      elements.boletaRate.value = '';
      elements.boletaSamco.value = '';
      elements.boletaExtra1Label.value = '';
      elements.boletaExtra1Amount.value = '';
      elements.boletaExtra2Label.value = '';
      elements.boletaExtra2Amount.value = '';
      elements.boletaRetired.value = '';
    } else {
      elements.boletaMeters.value = contributor.frontMeters;
      elements.boletaRate.value = contributor.ratePerMeter;
      elements.boletaSamco.value = contributor.samcoContribution;
      elements.boletaExtra1Label.value = contributor.extraServices[0]?.label || '';
      elements.boletaExtra1Amount.value = contributor.extraServices[0]?.amount ?? '';
      elements.boletaExtra2Label.value = contributor.extraServices[1]?.label || '';
      elements.boletaExtra2Amount.value = contributor.extraServices[1]?.amount ?? '';
      elements.boletaRetired.value = contributor.retiredDiscountPercent ?? '';
    }

    updateBoletaPreview();
  }

  function synchronizeBoletaContributor(contributorId) {
    const currentSelection = elements.boletaContributor.value;
    if (!currentSelection) {
      elements.boletaContributor.value = contributorId;
      handleBoletaContributorChange();
    } else if (currentSelection === contributorId) {
      handleBoletaContributorChange();
    }
  }

  function updateBoletaPreview(showFeedback = false) {
    const contributorId = elements.boletaContributor.value;
    const contributor = state.contributors.find(item => item.id === contributorId);

    if (!contributor) {
      elements.previewArticle.setAttribute('hidden', 'hidden');
      elements.previewPlaceholder.hidden = false;
      if (showFeedback) {
        elements.boletaFeedback.textContent = 'Seleccione un contribuyente antes de generar la boleta.';
      }
      return;
    }

    elements.previewPlaceholder.hidden = true;
    elements.previewArticle.removeAttribute('hidden');
    elements.boletaFeedback.textContent = '';

    const month = Number.parseInt(elements.boletaMonth.value, 10) || 1;
    const year = Number.parseInt(elements.boletaYear.value, 10) || new Date().getFullYear();
    const dueDateRaw = elements.boletaDueDate.value;
    const frontMeters = toNumber(elements.boletaMeters.value) || contributor.frontMeters;
    const ratePerMeter = toNumber(elements.boletaRate.value) || contributor.ratePerMeter;
    const samcoContribution = toNumber(elements.boletaSamco.value) || 0;

    const extra1Label = elements.boletaExtra1Label.value.trim();
    const extra1Amount = toNumber(elements.boletaExtra1Amount.value) || 0;
    const extra2Label = elements.boletaExtra2Label.value.trim();
    const extra2Amount = toNumber(elements.boletaExtra2Amount.value) || 0;
    const retiredPercent = clamp(toNumber(elements.boletaRetired.value), 0, 100);

    const baseAmount = frontMeters * ratePerMeter;
    const subtotal = baseAmount + samcoContribution + extra1Amount + extra2Amount;
    const discountAmount = subtotal * (retiredPercent / 100);
    const total = Math.max(subtotal - discountAmount, 0);

    const baseDetail = `${formatMeters(frontMeters)} × ${formatCurrency(ratePerMeter)}`;
    const billingPeriod = `${formatMonth(month)} ${year}`;
    const dueDate = dueDateRaw ? formatDate(dueDateRaw) : '—';
    const generationDate = formatDateTime(new Date());

    const barcodeValue = buildBarcodeValue(contributor.clientNumber, year, month, total);

    setField('billingPeriod', billingPeriod);
    setField('dueDate', dueDate);
    setField('clientNumber', contributor.clientNumber || '—');
    setField('generationDate', generationDate);
    setField('fullName', contributor.fullName || '—');
    setField('address', contributor.address || '—');
    setField('frontMeters', formatMeters(frontMeters));
    setField('ratePerMeter', formatCurrency(ratePerMeter));
    setField('baseDetail', baseDetail);
    setField('baseAmount', formatCurrency(baseAmount));
    setField('samco', formatCurrency(samcoContribution));
    setField('extra1Label', extra1Label || 'Servicio adicional 1');
    setField('extra1Amount', formatCurrency(extra1Amount));
    setField('extra2Label', extra2Label || 'Servicio adicional 2');
    setField('extra2Amount', formatCurrency(extra2Amount));
    setField('discountDetail', `${formatNumber(retiredPercent)} %`);
    setField('discountAmount', discountAmount ? `- ${formatCurrency(discountAmount)}` : formatCurrency(0));
    setField('total', formatCurrency(total));
    setField('barcodeValue', barcodeValue);

    toggleRow('extra1', Boolean(extra1Label) || extra1Amount > 0);
    toggleRow('extra2', Boolean(extra2Label) || extra2Amount > 0);
    toggleRow('discount', retiredPercent > 0 && discountAmount > 0.01);

    renderBarcode(barcodeValue);
  }

  function setField(field, value) {
    const elementsToUpdate = document.querySelectorAll(`[data-field="${field}"]`);
    elementsToUpdate.forEach(node => {
      if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
        node.value = value;
      } else {
        node.textContent = value;
      }
    });
  }

  function toggleRow(rowName, visible) {
    const rows = document.querySelectorAll(`[data-row="${rowName}"]`);
    rows.forEach(row => {
      row.classList.toggle('hidden', !visible);
    });
  }

  function renderBarcode(value) {
    const sanitized = sanitizeForBarcode(value);
    elements.barcodeCanvases.forEach(canvas => drawCode39(canvas, sanitized));
  }

  function sanitizeForBarcode(value) {
    if (!value) return '';
    const cleaned = value.toUpperCase().replace(/[^0-9A-Z\-\.\$\/\+% ]/g, '');
    return cleaned.trim();
  }

  function drawCode39(canvas, value) {
    const ctx = canvas.getContext('2d');
    if (!value) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const patternMap = {
      '0': 'nnnwwnwnn',
      '1': 'wnnwnnnnw',
      '2': 'nnwwnnnnw',
      '3': 'wnwwnnnnn',
      '4': 'nnnwwnnnw',
      '5': 'wnnwwnnnn',
      '6': 'nnwwwnnnn',
      '7': 'nnnwnnwnw',
      '8': 'wnnwnnwnn',
      '9': 'nnwwnnwnn',
      A: 'wnnnnwnnw',
      B: 'nnwnnwnnw',
      C: 'wnwnnwnnn',
      D: 'nnnnwwnnw',
      E: 'wnnnwwnnn',
      F: 'nnwnwwnnn',
      G: 'nnnnnwwnw',
      H: 'wnnnnwwnn',
      I: 'nnwnnwwnn',
      J: 'nnnnwwwnn',
      K: 'wnnnnnnww',
      L: 'nnwnnnnww',
      M: 'wnwnnnnwn',
      N: 'nnnnwnnww',
      O: 'wnnnwnnwn',
      P: 'nnwnwnnwn',
      Q: 'nnnnnnwww',
      R: 'wnnnnnwwn',
      S: 'nnwnnnwwn',
      T: 'nnnnwnwwn',
      U: 'wwnnnnnnw',
      V: 'nwwnnnnnw',
      W: 'wwwnnnnnn',
      X: 'nwnnwnnnw',
      Y: 'wwnnwnnnn',
      Z: 'nwwnwnnnn',
      '-': 'nwnnnnwnw',
      '.': 'wwnnnnwnn',
      ' ': 'nwwnnnwnn',
      $: 'nwnwnwnnn',
      '/': 'nwnwnnnwn',
      '+': 'nwnnnwnwn',
      '%': 'nnnwnwnwn',
      '*': 'nwnnwnwnn'
    };

    const encoded = `*${value}*`;
    const narrow = 2;
    const wide = narrow * 3;
    const height = canvas.height || 70;
    const quiet = 10;

    let width = quiet * 2;
    for (const char of encoded) {
      const pattern = patternMap[char];
      if (!pattern) continue;
      for (const symbol of pattern) {
        width += symbol === 'n' ? narrow : wide;
      }
      width += narrow; // espacio entre caracteres
    }

    width -= narrow; // quitar último espacio extra
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#000000';
    ctx.imageSmoothingEnabled = false;

    let x = quiet;
    for (const char of encoded) {
      const pattern = patternMap[char];
      if (!pattern) continue;
      for (let i = 0; i < pattern.length; i++) {
        const symbol = pattern[i];
        const barWidth = symbol === 'n' ? narrow : wide;
        if (i % 2 === 0) {
          ctx.fillRect(x, 0, barWidth, height);
        }
        x += barWidth;
      }
      x += narrow;
    }
  }

  function buildBarcodeValue(clientNumber, year, month, total) {
    const normalizedClient = (clientNumber || '')
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, '')
      .padStart(4, '0');
    const totalCents = Math.round(total * 100)
      .toString()
      .padStart(6, '0');
    const period = `${year}${String(month).padStart(2, '0')}`;
    const base = normalizedClient || '0000';
    return `${base}-${period}-${totalCents}`;
  }

  function createId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function toNumber(value) {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    const normalized = String(value).replace(/,/g, '.');
    const number = Number.parseFloat(normalized);
    return Number.isFinite(number) ? number : 0;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function formatCurrency(value) {
    const number = Number.isFinite(value) ? value : 0;
    try {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2
      }).format(number);
    } catch (error) {
      return `$${number.toFixed(2)}`;
    }
  }

  function formatMeters(value) {
    const number = Number.isFinite(value) ? value : 0;
    return `${formatNumber(number)} m`;
  }

  function formatPercent(value) {
    const number = Number.isFinite(value) ? value : 0;
    return `${formatNumber(number)} %`;
  }

  function formatNumber(value) {
    const number = Number.isFinite(value) ? value : 0;
    try {
      return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: number % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2
      }).format(number);
    } catch (error) {
      return number.toFixed(number % 1 === 0 ? 0 : 2);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }

  function formatDateTime(date) {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function formatMonth(month) {
    const date = new Date(2000, clamp(month - 1, 0, 11), 1);
    try {
      return new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(date);
    } catch (error) {
      const names = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre'
      ];
      return names[clamp(month - 1, 0, 11)];
    }
  }

  function formatForInput(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().split('T')[0];
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();

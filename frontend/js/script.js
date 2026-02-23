/**
 * script.js — Expense Tracker
 * Location : frontend/js/script.js
 * Purpose  : jQuery CRUD logic for the Expense Tracker SPA.
 *
 * Sections:
 *   A. Data Store
 *   B. Document Ready / Init
 *   C. Event Binding
 *   D. Form Handlers
 *   E. Validation
 *   F. Table Rendering
 *   G. Summary Cards
 *   H. Utility Helpers
 */

(function ($) {
    'use strict';

    /* ── A. Data Store ────────────────────────────────────────── */
    // In-memory transaction list (each item: { id, description, amount, type, date })
    let transactions = [];
    let nextId = 1;

    /* ── B. Document Ready ────────────────────────────────────── */
    $(document).ready(function () {
        setTodayDate();   // Default date input to today
        bindEvents();     // Wire up all event listeners
        renderTable();    // Show empty state on load
        updateSummary();  // Reset summary cards to $0.00
    });

    /* ── C. Event Binding ─────────────────────────────────────── */
    function bindEvents() {
        $('#transactionForm').on('submit', handleFormSubmit);
        $('#clearBtn').on('click', handleClear);
        // Event delegation: works for dynamically added rows
        $('#transactionBody').on('click', '.btn-delete', handleDelete);
    }

    /* ── D. Form Handlers ─────────────────────────────────────── */

    function handleFormSubmit(event) {
        event.preventDefault();

        const description = $('#txDescription').val().trim();
        const amount = parseFloat($('#txAmount').val());
        const type = $('#txType').val();
        const date = $('#txDate').val();

        // Validate before adding
        if (!validateInputs(description, amount, date)) {
            $('.form-wrapper').addClass('shake');
            setTimeout(() => $('.form-wrapper').removeClass('shake'), 450);
            return;
        }

        // Build and store transaction
        transactions.push({ id: nextId++, description, amount, type, date });

        renderTable();
        updateSummary();
        resetForm();
    }

    function handleClear() {
        resetForm();
    }

    function handleDelete() {
        const idToRemove = parseInt($(this).data('id'), 10);
        transactions = transactions.filter(tx => tx.id !== idToRemove);
        $(this).closest('tr').fadeOut(200, () => {
            renderTable();
            updateSummary();
        });
    }

    /* ── E. Validation ────────────────────────────────────────── */

    function validateInputs(description, amount, date) {
        let isValid = true;
        clearValidation();
        if (!description) { markInvalid('#txDescription'); isValid = false; }
        if (isNaN(amount) || amount <= 0) { markInvalid('#txAmount'); isValid = false; }
        if (!date) { markInvalid('#txDate'); isValid = false; }
        return isValid;
    }

    function markInvalid(selector) { $(selector).addClass('is-invalid'); }
    function clearValidation() { $('.custom-input').removeClass('is-invalid'); }

    /* ── F. Table Rendering ───────────────────────────────────── */

    function renderTable() {
        const $tbody = $('#transactionBody');
        $tbody.empty();
        updateCountBadge();

        if (transactions.length === 0) {
            $tbody.append(buildEmptyRow());
            return;
        }

        // Show newest first
        [...transactions].reverse().forEach((tx, i) => {
            $tbody.append(buildRow(tx, i + 1).addClass('tx-row-new'));
        });
    }

    function buildRow(tx, serial) {
        const amountClass = tx.type === 'income' ? 'tx-amount-income' : 'tx-amount-expense';
        const typeBadge = `
      <span class="type-badge ${tx.type}">
        <i class="bi bi-arrow-${tx.type === 'income' ? 'down' : 'up'}-short"></i>
        ${tx.type}
      </span>`;

        return $(`
      <tr>
        <td class="tx-serial">${serial}</td>
        <td>${escapeHtml(tx.description)}</td>
        <td>${typeBadge}</td>
        <td class="${amountClass}">$${tx.amount.toFixed(2)}</td>
        <td>${formatDate(tx.date)}</td>
        <td class="text-center">
          <button class="btn-delete" data-id="${tx.id}" title="Delete">
            <i class="bi bi-trash3-fill"></i>
          </button>
        </td>
      </tr>`);
    }

    function buildEmptyRow() {
        return $(`
      <tr id="emptyRow">
        <td colspan="6" class="text-center py-5 empty-state">
          <i class="bi bi-inbox fs-1 d-block mb-2"></i>
          No transactions yet. Add one above!
        </td>
      </tr>`);
    }

    /* ── G. Summary Cards ─────────────────────────────────────── */

    function updateSummary() {
        let income = 0, expense = 0;
        transactions.forEach(tx => {
            if (tx.type === 'income') income += tx.amount;
            else expense += tx.amount;
        });
        animateValue('#totalIncome', income);
        animateValue('#totalExpense', expense);
        animateValue('#balance', income - expense);
    }

    function animateValue(selector, value) {
        const $el = $(selector).removeClass('pulse');
        setTimeout(() => $el.text(formatCurrency(value)).addClass('pulse'), 10);
    }

    function updateCountBadge() {
        const n = transactions.length;
        $('#txCount').text(n === 1 ? '1 record' : `${n} records`);
    }

    /* ── H. Utility Helpers ───────────────────────────────────── */

    function setTodayDate() {
        $('#txDate').val(new Date().toISOString().split('T')[0]);
    }

    function resetForm() {
        $('#transactionForm')[0].reset();
        clearValidation();
        setTodayDate();
        $('#txType').val('income');
    }

    function formatCurrency(value) {
        const prefix = value < 0 ? '-$' : '$';
        return prefix + Math.abs(value).toLocaleString('en-US', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });
    }

    function formatDate(iso) {
        if (!iso) return '—';
        return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    }

    function escapeHtml(text) {
        return $('<div>').text(text).html();
    }

})(jQuery);

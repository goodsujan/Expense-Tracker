/**
 * ================================================================
 *  script.js — Expense Tracker  |  jQuery Interaction Layer
 *  File    : frontend/js/script.js
 *  Author  : Sujan
 *  Purpose : Handles all client-side behaviour for the Expense
 *            Tracker SPA — form submission, dynamic table
 *            rendering, summary card updates, and UI feedback.
 *
 *  ⚠  NOTE: This file is intentionally backend-free.
 *            All data lives in the `transactions` array (RAM).
 *            Backend integration will be added in a later step.
 *
 *  TABLE OF CONTENTS
 *  ─────────────────────────────────────────────────────────────
 *   §A.  Configuration & Constants
 *   §B.  In-Memory Data Store
 *   §C.  Document Ready — Bootstraps the application
 *   §D.  Initialisation Helpers
 *   §E.  Event Binding — All jQuery listeners in one place
 *   §F.  Form Handlers  (submit, clear)
 *   §G.  Validation Logic
 *   §H.  Table Rendering  (build, render, delete)
 *   §I.  Summary Card Updates
 *   §J.  UI Feedback  (toast, inline alerts, animations)
 *   §K.  Utility / Helper Functions
 *  ─────────────────────────────────────────────────────────────
 * ================================================================
 */

/* ================================================================
   IIFE  (Immediately Invoked Function Expression)
   Wraps everything so our variables & functions stay private
   and never pollute the global window scope.
   We pass in jQuery as $ to guarantee the alias even if
   another library (Prototype, etc.) uses $ as well.
================================================================ */
(function ($) {

    'use strict'; /* Catch common JS mistakes early */


    /* ==============================================================
       §A.  CONFIGURATION & CONSTANTS
       Keep "magic values" here so they are easy to find and change.
    ============================================================== */

    const CONFIG = {
        dateLocale: 'en-US',          // Locale for date formatting
        currencyCode: 'USD',            // ISO currency code
        toastDuration: 3000,             // ms before auto-toast hides
        fadeDuration: 200,              // ms for jQuery .fadeOut()
        shakeDuration: 450,              // ms — must match CSS @keyframes
        animDelay: 10,               // ms micro-delay for pulse trick
        maxDescLen: 100,              // Max chars in description field
        defaultType: 'income',         // Pre-select on form reset
    };

    /* Selector cache — avoid re-querying the DOM on every event */
    const SEL = {
        form: '#transactionForm',
        description: '#txDescription',
        amount: '#txAmount',
        type: '#txType',
        date: '#txDate',
        addBtn: '#addBtn',
        addBtnFull: '#addBtnFull',
        clearBtn: '#clearBtn',
        tbody: '#transactionBody',
        txCount: '#txCount',
        totalIncome: '#totalIncome',
        totalExpense: '#totalExpense',
        balance: '#balance',
        formWrapper: '.form-wrapper',
        inputs: '.custom-input',
        toast: '#feedbackToast',
        alertBox: '#inlineAlert',
    };


    /* ==============================================================
       §B.  IN-MEMORY DATA STORE
       A simple JS array acts as the single source of truth.
       Each transaction is a plain object:
       {
         id          : {number}  — unique auto-incremented integer
         description : {string}  — user-entered label
         amount      : {number}  — always positive float
         type        : {string}  — 'income' | 'expense'
         date        : {string}  — YYYY-MM-DD (ISO date)
         createdAt   : {string}  — ISO timestamp (for ordering)
       }
    ============================================================== */

    let transactions = []; /* Master list — treat as immutable except via helpers */
    let _nextId = 1;  /* Private auto-increment counter                      */

    /**
     * addTransaction(data)
     * Pushes a new transaction object into the array.
     * Returns the created object so callers can use it.
     *
     * @param  {{ description, amount, type, date }} data
     * @returns {Object} The newly created transaction
     */
    function addTransaction(data) {
        const tx = {
            id: _nextId++,
            description: data.description,
            amount: parseFloat(data.amount),
            type: data.type,
            date: data.date,
            createdAt: new Date().toISOString(),
        };
        transactions.push(tx);
        return tx;
    }

    /**
     * removeTransaction(id)
     * Filters the array to exclude the item with the given id.
     * Uses a filter so the original reference is replaced —
     * this avoids splice index issues if multiple deletes queue up.
     *
     * @param {number} id
     */
    function removeTransaction(id) {
        transactions = transactions.filter(function (tx) {
            return tx.id !== id;
        });
    }


    /* ==============================================================
       §C.  DOCUMENT READY
       jQuery's entry point — fires when the DOM is fully parsed.
       We call our own init function to keep this block clean.
    ============================================================== */
    $(document).ready(function () {
        initApp();
    });


    /* ==============================================================
       §D.  INITIALISATION HELPERS
    ============================================================== */

    /**
     * initApp()
     * Sets up the default UI state on first load.
     */
    function initApp() {
        setTodayDate();    // Date picker defaults to today
        bindEvents();      // Wire up all jQuery listeners
        renderTable();     // Render empty state on first load
        updateSummary();   // Show $0.00 on all summary cards
    }

    /**
     * setTodayDate()
     * Sets the date input's value to today in YYYY-MM-DD format.
     * <input type="date"> requires exactly this format.
     */
    function setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        $(SEL.date).val(today);
    }


    /* ==============================================================
       §E.  EVENT BINDING
       All $.on() calls live here in a single function.
       This makes it easy to see every user interaction at a glance.
    ============================================================== */

    function bindEvents() {

        /* ── Form: Submit ─────────────────────────────────────────
           Intercept the form's native submit so the page never
           reloads. Validation and data handling done in handler.
        ───────────────────────────────────────────────────────── */
        $(SEL.form).on('submit', handleFormSubmit);

        /* ── Form: Clear button ───────────────────────────────────
           Resets fields and removes all validation styling.
        ───────────────────────────────────────────────────────── */
        $(SEL.clearBtn).on('click', handleClear);

        /* ── Table: Delete row ────────────────────────────────────
           Event delegation on the static <tbody> element —
           this catches clicks on delete buttons that are added
           dynamically AFTER the page loads.
           Without delegation, $(SEL.tbody + ' .btn-delete').on(...)
           would only match elements present at binding time.
        ───────────────────────────────────────────────────────── */
        $(SEL.tbody).on('click', '.btn-delete', handleDelete);

        /* ── Description field: Live character validation ─────────
           Clear the is-invalid class as the user starts typing
           so they get immediate positive feedback.
        ───────────────────────────────────────────────────────── */
        $(SEL.description).on('input', function () {
            if ($(this).val().trim().length > 0) {
                $(this).removeClass('is-invalid');
            }
        });

        /* ── Amount field: Live numeric validation ─────────────── */
        $(SEL.amount).on('input', function () {
            const val = parseFloat($(this).val());
            if (!isNaN(val) && val > 0) {
                $(this).removeClass('is-invalid');
            }
        });

        /* ── Type selector: Update form accent colour on change ─── */
        $(SEL.type).on('change', handleTypeChange);

    }


    /* ==============================================================
       §F.  FORM HANDLERS
    ============================================================== */

    /**
     * handleFormSubmit(event)
     * ─────────────────────────────────────────────────────────────
     * Fired on: #transactionForm submit
     *
     * Flow:
     *   1. Prevent default (no page reload)
     *   2. Read field values
     *   3. Validate — abort with shake + error if invalid
     *   4. Add to data store
     *   5. Re-render table
     *   6. Re-calculate summary cards
     *   7. Show success feedback toast
     *   8. Reset the form
     *
     * @param {jQuery.Event} event
     */
    function handleFormSubmit(event) {
        /* Step 1 — Stop the browser from navigating */
        event.preventDefault();
        event.stopPropagation();

        /* Step 2 — Read field values */
        const formData = readFormValues();

        /* Step 3 — Validate */
        if (!validateInputs(formData)) {
            triggerShake();          /* Wiggle the form card */
            showInlineAlert(
                'Please fill in all required fields correctly.',
                'danger'
            );
            return;                  /* ← Exit early, do NOT add the transaction */
        }

        /* Step 4 — Persist to in-memory store */
        const newTx = addTransaction(formData);

        /* Step 5 — Rebuild the table */
        renderTable();

        /* Step 6 — Recalculate dashboard cards */
        updateSummary();

        /* Step 7 — Positive feedback */
        showInlineAlert(
            '<i class="bi bi-check-circle-fill me-1"></i>' +
            'Transaction added: <strong>' + escapeHtml(newTx.description) + '</strong>',
            'success'
        );

        /* Step 8 — Reset the form for the next entry */
        resetForm();

        /* Scroll to the table so the user can see the new row */
        scrollToTable();
    }


    /**
     * handleClear()
     * ─────────────────────────────────────────────────────────────
     * Fired on: #clearBtn click
     * Resets all form fields and removes validation styling.
     */
    function handleClear() {
        resetForm();
        clearInlineAlert();
    }


    /**
     * handleDelete()
     * ─────────────────────────────────────────────────────────────
     * Fired on: click inside #transactionBody on any .btn-delete
     *
     * 'this' refers to the clicked button element.
     * We read the transaction ID from its data-id attribute,
     * fade out the row for a smooth visual, then:
     *   • Remove from data store
     *   • Re-render (updates row numbers & empty state)
     *   • Update summary cards
     */
    function handleDelete() {
        const $btn = $(this);
        const idToRemove = parseInt($btn.data('id'), 10);
        const $row = $btn.closest('tr');

        /* Fade the row out before touching the data */
        $row.fadeOut(CONFIG.fadeDuration, function () {
            removeTransaction(idToRemove);
            renderTable();
            updateSummary();
            showInlineAlert(
                '<i class="bi bi-trash3 me-1"></i>Transaction removed.',
                'warning'
            );
        });
    }


    /**
     * handleTypeChange()
     * ─────────────────────────────────────────────────────────────
     * Fired on: #txType change
     * Adds a visual hint by adjusting the Add button's gradient
     * when the selected type is 'expense' (red tint).
     */
    function handleTypeChange() {
        const type = $(SEL.type).val();
        const $addBtn = $(SEL.addBtn + ', ' + SEL.addBtnFull);

        if (type === 'expense') {
            /* Shift gradient toward red for expense context */
            $addBtn.css('background',
                'linear-gradient(135deg, #e63946 0%, #b71c1c 100%)'
            );
        } else {
            /* Restore default blue-purple gradient */
            $addBtn.css('background', '');
        }
    }


    /* ==============================================================
       §G.  VALIDATION LOGIC
    ============================================================== */

    /**
     * readFormValues()
     * Reads all form fields and returns a plain object.
     * Trimming whitespace from text fields prevents "   " passing.
     *
     * @returns {{ description, amount, type, date }}
     */
    function readFormValues() {
        return {
            description: $(SEL.description).val().trim(),
            amount: $(SEL.amount).val(),        /* kept as string for validation */
            type: $(SEL.type).val(),
            date: $(SEL.date).val(),
        };
    }

    /**
     * validateInputs(data)
     * ─────────────────────────────────────────────────────────────
     * Checks each required field and marks invalid ones with
     * Bootstrap's .is-invalid class (which shows .invalid-feedback).
     *
     * Rules:
     *   description — non-empty, max 100 chars
     *   amount      — numeric, greater than 0
     *   date        — non-empty
     *
     * @param  {{ description, amount, type, date }} data
     * @returns {boolean}  true if ALL fields pass validation
     */
    function validateInputs(data) {
        let valid = true;

        /* Reset previous validation marks first */
        clearValidationState();

        /* ── Description ──────────────────────────────────────── */
        if (!data.description || data.description.length < 1) {
            markInvalid(SEL.description);
            valid = false;
        } else if (data.description.length > CONFIG.maxDescLen) {
            markInvalid(SEL.description,
                'Description must be ' + CONFIG.maxDescLen + ' characters or fewer.'
            );
            valid = false;
        }

        /* ── Amount ───────────────────────────────────────────── */
        const amt = parseFloat(data.amount);
        if (data.amount === '' || isNaN(amt) || amt <= 0) {
            markInvalid(SEL.amount);
            valid = false;
        }

        /* ── Date ─────────────────────────────────────────────── */
        if (!data.date) {
            markInvalid(SEL.date);
            valid = false;
        }

        return valid;
    }

    /**
     * markInvalid(selector, [customMsg])
     * Adds .is-invalid to the target input, which triggers
     * Bootstrap to show the sibling .invalid-feedback div.
     * Optionally replaces the feedback text with a custom message.
     *
     * @param {string} selector   — CSS selector of the input
     * @param {string} [customMsg]— Optional override text
     */
    function markInvalid(selector, customMsg) {
        const $input = $(selector).addClass('is-invalid');
        if (customMsg) {
            $input.siblings('.invalid-feedback').text(customMsg);
        }
    }

    /**
     * clearValidationState()
     * Removes all .is-invalid classes from form inputs.
     * Called before each new validation run.
     */
    function clearValidationState() {
        $(SEL.inputs).removeClass('is-invalid');
    }


    /* ==============================================================
       §H.  TABLE RENDERING
    ============================================================== */

    /**
     * renderTable()
     * ─────────────────────────────────────────────────────────────
     * Completely rebuilds the #transactionBody content from the
     * current state of the `transactions` array.
     *
     * Strategy — Clear & Rebuild:
     *   Simple and correct for small datasets in a lab context.
     *   For large datasets, a virtualised/diffing approach would
     *   be preferred, but is out of scope here.
     *
     * Display order: newest first (reverse of insertion order).
     */
    function renderTable() {
        const $tbody = $(SEL.tbody);

        /* Clear all existing rows */
        $tbody.empty();

        /* Update the "N records" badge */
        updateCountBadge();

        /* ── Empty state ─────────────────────────────────────── */
        if (transactions.length === 0) {
            $tbody.append(buildEmptyRow());
            return; /* Nothing more to do */
        }

        /* ── Build rows ─────────────────────────────────────── */
        /*
          We spread into a new array and reverse so the newest
          transaction appears at the top (#1) of the table,
          without mutating the original `transactions` array.
        */
        const displayList = [...transactions].reverse();

        displayList.forEach(function (tx, index) {
            const serial = index + 1;          /* 1-based display index */
            const $row = buildRow(tx, serial);

            /*
              Adding .tx-row-new triggers the CSS slide-in animation.
              The class is removed after the animation plays so it
              can be triggered again if the table is re-rendered.
            */
            $row.addClass('tx-row-new');
            $tbody.append($row);
        });
    }


    /**
     * buildRow(tx, serial)
     * ─────────────────────────────────────────────────────────────
     * Constructs and returns a single jQuery <tr> element that
     * represents one transaction.
     *
     * @param  {Object} tx     — Transaction object from data store
     * @param  {number} serial — 1-based display index
     * @returns {jQuery}        — <tr> jQuery object
     */
    function buildRow(tx, serial) {
        /* Determine CSS class for the amount cell */
        const amountClass = (tx.type === 'income')
            ? 'tx-amount-income'
            : 'tx-amount-expense';

        /* Arrow icon direction differs by type */
        const arrowIcon = (tx.type === 'income')
            ? 'bi-arrow-down-short'
            : 'bi-arrow-up-short';

        /* Coloured pill badge for the Type column */
        const typeBadge =
            '<span class="type-badge ' + tx.type + '">' +
            '<i class="bi ' + arrowIcon + '" aria-hidden="true"></i>' +
            tx.type.charAt(0).toUpperCase() + tx.type.slice(1) +
            '</span>';

        /*
          SECURITY NOTE:
          tx.description is passed through escapeHtml() before
          being injected into the DOM, preventing XSS attacks
          if the user typed HTML/script tags into the description.
          All other fields (amount, date, type) are generated by
          our code, not raw user input.
        */
        const safeDesc = escapeHtml(tx.description);

        /* Build the complete <tr> using a template string */
        const rowHtml =
            '<tr data-tx-id="' + tx.id + '">' +

            /* # — Serial number */
            '<td class="tx-serial">' + serial + '</td>' +

            /* Description */
            '<td>' +
            '<span class="tx-description" title="' + safeDesc + '">' +
            safeDesc +
            '</span>' +
            '</td>' +

            /* Type badge */
            '<td>' + typeBadge + '</td>' +

            /* Amount — coloured by type */
            '<td class="' + amountClass + '">' +
            formatCurrency(tx.amount) +
            '</td>' +

            /* Date — human-readable format */
            '<td>' + formatDate(tx.date) + '</td>' +

            /* Action — Delete button */
            '<td class="text-center">' +
            '<button ' +
            'class="btn-delete" ' +
            'data-id="' + tx.id + '" ' +
            'title="Delete this transaction" ' +
            'aria-label="Delete ' + safeDesc + '"' +
            '>' +
            '<i class="bi bi-trash3-fill" aria-hidden="true"></i>' +
            '</button>' +
            '</td>' +

            '</tr>';

        return $(rowHtml);
    }


    /**
     * buildEmptyRow()
     * ─────────────────────────────────────────────────────────────
     * Returns the "no transactions" placeholder <tr>.
     * Shown whenever `transactions.length === 0`.
     *
     * @returns {jQuery} — empty-state <tr>
     */
    function buildEmptyRow() {
        return $([
            '<tr id="emptyRow">',
            '<td colspan="6" class="text-center empty-state py-5">',
            '<i class="bi bi-inbox" aria-hidden="true"></i>',
            '<span>No transactions yet.</span>',
            '<br />',
            '<small>Fill in the form above and click ',
            '<strong>Add Transaction</strong>.',
            '</small>',
            '</td>',
            '</tr>',
        ].join(''));
    }


    /* ==============================================================
       §I.  SUMMARY CARD UPDATES
    ============================================================== */

    /**
     * updateSummary()
     * ─────────────────────────────────────────────────────────────
     * Aggregates all transactions into income / expense totals,
     * derives the balance, then updates the three summary cards
     * with animated number changes.
     *
     * Called after every add or delete operation.
     */
    function updateSummary() {
        let totalIncome = 0;
        let totalExpense = 0;

        /* Single-pass aggregation */
        transactions.forEach(function (tx) {
            if (tx.type === 'income') {
                totalIncome += tx.amount;
            } else {
                totalExpense += tx.amount;
            }
        });

        const netBalance = totalIncome - totalExpense;

        /* Push values to the DOM with a pulse animation */
        animateCardValue(SEL.totalIncome, totalIncome);
        animateCardValue(SEL.totalExpense, totalExpense);
        animateCardValue(SEL.balance, netBalance);

        /* Change the balance card text colour if account is overdrawn */
        const $balEl = $(SEL.balance);
        if (netBalance < 0) {
            $balEl.addClass('text-danger').removeClass('');
        } else {
            $balEl.removeClass('text-danger');
        }
    }

    /**
     * animateCardValue(selector, value)
     * ─────────────────────────────────────────────────────────────
     * Updates a summary card's amount element with a CSS pulse
     * animation to draw the user's eye to the change.
     *
     * Trick: we must remove .pulse, wait one tick (setTimeout 10ms),
     * then re-add it — so the browser registers the class removal
     * and restarts the animation from the beginning.
     *
     * @param {string} selector — CSS selector for the <h3> element
     * @param {number} value    — Numeric value to display
     */
    function animateCardValue(selector, value) {
        const $el = $(selector);

        /* Remove first so the animation can retrigger */
        $el.removeClass('pulse');

        /*
          Micro-delay allows the browser to process the removal
          before we add the class back and set the new text.
        */
        setTimeout(function () {
            $el.text(formatCurrency(value)).addClass('pulse');
        }, CONFIG.animDelay);
    }

    /**
     * updateCountBadge()
     * Updates the "N records" badge next to the Transactions heading.
     * Correctly handles the singular case ("1 record").
     */
    function updateCountBadge() {
        const n = transactions.length;
        const label = (n === 1) ? '1 record' : (n + ' records');
        $(SEL.txCount).text(label);
    }


    /* ==============================================================
       §J.  UI FEEDBACK
       Provides inline alerts and micro-animation helpers.
       No backend yet, so we only give in-page visual feedback.
    ============================================================== */

    /**
     * showInlineAlert(message, type)
     * ─────────────────────────────────────────────────────────────
     * Displays a dismissible Bootstrap alert directly below the
     * form's action button row.
     *
     * The alert auto-dismisses after CONFIG.toastDuration ms.
     *
     * @param {string} message  — HTML string for the alert body
     * @param {string} type     — Bootstrap colour: 'success' | 'danger' | 'warning' | 'info'
     */
    function showInlineAlert(message, type) {
        /* Remove any existing alert first */
        clearInlineAlert();

        /* Map type to the matching Bootstrap alert style */
        const iconMap = {
            success: 'bi-check-circle-fill',
            danger: 'bi-x-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill',
        };

        const alertHtml =
            '<div id="inlineAlert" ' +
            'class="alert alert-' + type + ' alert-dismissible ' +
            'fade show d-flex align-items-center gap-2 mt-3" ' +
            'role="alert" ' +
            'aria-live="assertive">' +

            /* Icon prefix */
            '<i class="bi ' + (iconMap[type] || 'bi-info-circle') + ' flex-shrink-0"' +
            ' aria-hidden="true"></i>' +

            /* Message body */
            '<span>' + message + '</span>' +

            /* Close button (Bootstrap's built-in dismiss) */
            '<button type="button" ' +
            'class="btn-close ms-auto" ' +
            'data-bs-dismiss="alert" ' +
            'aria-label="Close">' +
            '</button>' +

            '</div>';

        /* Inject the alert after the form's bottom button row */
        $(SEL.formWrapper).append(alertHtml);

        /* Auto-dismiss */
        setTimeout(function () {
            $('#inlineAlert').alert('close');
        }, CONFIG.toastDuration);
    }

    /**
     * clearInlineAlert()
     * Removes any currently rendered inline alert immediately.
     */
    function clearInlineAlert() {
        $('#inlineAlert').remove();
    }

    /**
     * triggerShake()
     * Applies the CSS shake animation to the form wrapper.
     * Used when the user tries to submit an invalid form.
     */
    function triggerShake() {
        const $wrapper = $(SEL.formWrapper);
        /* Remove first so the animation can retrigger if called again */
        $wrapper.removeClass('shake');
        /*
          Forcing reflow (reading offsetWidth) is a classic trick to
          ensure the browser processes the class removal before we
          add it back — without this, rapid calls would not re-shake.
        */
        void $wrapper[0].offsetWidth; /* jshint ignore:line */
        $wrapper.addClass('shake');
        /* Clean up class after animation ends */
        setTimeout(function () {
            $wrapper.removeClass('shake');
        }, CONFIG.shakeDuration);
    }

    /**
     * scrollToTable()
     * Smoothly scrolls the page so the transactions table
     * is visible after a successful form submission.
     */
    function scrollToTable() {
        const $table = $('#tableSection');
        const offsetPx = 80; /* Account for the sticky navbar height */

        if ($table.length) {
            $('html, body').animate({
                scrollTop: $table.offset().top - offsetPx,
            }, 350);
        }
    }


    /* ==============================================================
       §K.  UTILITY / HELPER FUNCTIONS
    ============================================================== */

    /**
     * resetForm()
     * ─────────────────────────────────────────────────────────────
     * Resets form fields to their defaults and clears validation.
     * Called after a successful submit or when the Clear button
     * is clicked.
     */
    function resetForm() {
        /* Native DOM reset clears all input values */
        $(SEL.form)[0].reset();

        /* Clear any lingering validation states */
        clearValidationState();

        /* Re-apply our custom defaults that reset() would undo */
        setTodayDate();
        $(SEL.type).val(CONFIG.defaultType).trigger('change');

        /* Return focus to the description field for quick re-entry */
        $(SEL.description).trigger('focus');
    }

    /**
     * formatCurrency(value)
     * ─────────────────────────────────────────────────────────────
     * Formats a number as a currency string using the Intl API.
     * Handles negative values (overdrawn balance) gracefully.
     *
     * Examples:
     *   1234.5  → "$1,234.50"
     *  -250     → "-$250.00"
     *   0       → "$0.00"
     *
     * @param  {number} value
     * @returns {string}
     */
    function formatCurrency(value) {
        const sign = value < 0 ? '-' : '';
        const abs = Math.abs(value);
        const formatted = abs.toLocaleString(CONFIG.dateLocale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        return sign + '$' + formatted;
    }

    /**
     * formatDate(isoString)
     * ─────────────────────────────────────────────────────────────
     * Converts a YYYY-MM-DD string into a human-readable date.
     *
     * Example:  "2026-02-23"  →  "Feb 23, 2026"
     *
     * ⚠  We append 'T00:00:00' to force local-midnight parsing.
     *    Without it, the Date constructor treats YYYY-MM-DD as
     *    UTC midnight, which can shift the date by one day in
     *    timezones behind UTC (e.g. UTC-5).
     *
     * @param  {string} isoString — YYYY-MM-DD
     * @returns {string}
     */
    function formatDate(isoString) {
        if (!isoString) return '—';
        const date = new Date(isoString + 'T00:00:00');
        return date.toLocaleDateString(CONFIG.dateLocale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }

    /**
     * escapeHtml(rawText)
     * ─────────────────────────────────────────────────────────────
     * Converts potentially dangerous HTML characters in user input
     * to their safe entity equivalents.
     *
     * Why: We build table rows by concatenating HTML strings.
     *      If a user types  <script>alert(1)</script>  in the
     *      description field, without escaping it would execute
     *      as real HTML when injected into the DOM.
     *
     * Technique: jQuery's .text() setter encodes entities;
     *            .html() getter then reads them as the encoded string.
     *
     * Example:
     *   '<b>Hello</b>'  →  '&lt;b&gt;Hello&lt;/b&gt;'
     *
     * @param  {string} rawText — Untrusted user-provided string
     * @returns {string}          Safe HTML string
     */
    function escapeHtml(rawText) {
        return $('<div>').text(String(rawText)).html();
    }


    /* ── End of IIFE ──────────────────────────────────────────── */

})(jQuery);  /* Pass the global jQuery reference as the local $ */

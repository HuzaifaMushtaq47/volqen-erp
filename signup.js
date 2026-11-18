/* Volqen ERP — signup wizard and provisioning status (no dependencies) */
(function () {
  "use strict";
  var CFG = window.VOLQEN_CONFIG || {};
  var S = CFG.signup || {};
  var API = S.apiBase || "/api";
  var DOMAIN = S.tenantDomain || "volqen.com";
  var PLANS = window.VOLQEN_PLANS || { plans: [], countries: [], currencies: {} };
  var MOD_NAMES = {};
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function plan(id) { return PLANS.plans.filter(function (p) { return p.id === id; })[0]; }
  function store(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || "null"); sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function fetchJSON(url, opts, ms) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms || 12000);
    opts = opts || {}; if (ctrl) opts.signal = ctrl.signal;
    return fetch(url, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { clearTimeout(t); return { ok: r.ok, status: r.status, body: j }; });
    }, function (e) { clearTimeout(t); throw e; });
  }
  $$("[data-tenant-domain]").forEach(function (el) { el.textContent = DOMAIN; });

  /* ===================== SIGNUP WIZARD ===================== */
  var form = $("#signup-form");
  if (form) {
    $$("[data-module-chips] input").forEach(function (i) { MOD_NAMES[i.value] = i.nextElementSibling.textContent; });
    var step = 1, LAST = 5;
    var statusEl = $(".form-status", form);
    var btnNext = $("[data-next]", form), btnBack = $("[data-back]", form), btnSubmit = $("[data-submit]", form);
    var subState = { value: "", ok: false, checking: false };

    // Preselect plan from #plan-xxx
    var hp = (location.hash || "").match(/^#plan-([a-z]+)/);
    if (hp && plan(hp[1])) { var r = form.querySelector('input[name=plan][value="' + hp[1] + '"]'); if (r) r.checked = true; }

    function val(n) { var el = form.elements[n]; if (!el) return ""; if (el.length !== undefined && !el.tagName) { var c = $$('input[name="' + n + '"]:checked', form)[0]; return c ? c.value : ""; } return (el.value || "").trim(); }
    function country() { var code = val("country"); return PLANS.countries.filter(function (c) { return c[1] === code; })[0]; }
    function billingCurrency() { var c = country(); var cur = c ? c[2] : "USD"; return PLANS.currencies[cur] ? cur : "USD"; }
    function priceText(p, cycle) {
      var cur = billingCurrency(); var amt = window.volqenPrice ? window.volqenPrice(p, cur, cycle) : null;
      return amt === null ? "Price TBA" : window.volqenFmt(cur, amt) + (cycle === "annual" ? "/yr" : "/mo");
    }

    function setErr(input, msg) {
      var f = input.closest(".field"); var e = f ? $(".err", f) : null;
      if (msg) { if (f) f.classList.add("invalid"); if (e) e.textContent = msg; input.setAttribute("aria-invalid", "true"); }
      else { if (f) f.classList.remove("invalid"); input.removeAttribute("aria-invalid"); }
    }
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, PHONE = /^\+?[\d\s()-]{8,18}$/, SUB = /^[a-z][a-z0-9-]{1,28}[a-z0-9]$/;
    function checkInput(i) {
      var v = (i.value || "").trim(), label = i.getAttribute("data-label") || "This field";
      if (i.type === "checkbox" && i.required) { setErr(i, i.checked ? "" : "Please accept to continue."); return i.checked; }
      if (i.required && !v) { setErr(i, label + " is required."); return false; }
      if (v && i.type === "email" && !EMAIL.test(v)) { setErr(i, "Enter a valid email, e.g. name@company.com."); return false; }
      if (v && i.type === "tel" && !PHONE.test(v)) { setErr(i, "Enter a valid phone number with country code, e.g. +971 50 123 4567."); return false; }
      var min = parseInt(i.getAttribute("minlength") || "0", 10); if (v && min && v.length < min) { setErr(i, label + " should be at least " + min + " characters."); return false; }
      if (i.name === "users") { var n = parseInt(v, 10), mx = plan(val("plan")).maxUsers; if (!(n >= 1 && n <= mx && String(n) === v)) { setErr(i, "Enter a whole number from 1 to " + mx + " for your plan."); return false; } }
      if (i.name === "currency" && !/^[A-Z]{3}$/.test(v)) { setErr(i, "Use a 3-letter currency code, e.g. USD."); return false; }
      if (i.name === "subdomain") {
        if (!SUB.test(v)) { setErr(i, "Use 3–30 lowercase letters, numbers or hyphens, starting with a letter."); return false; }
        if (subState.value === v && !subState.ok && !subState.checking) { setErr(i, "This address is already taken. Try another."); return false; }
      }
      setErr(i, ""); return true;
    }
    function validateStep(n) {
      var panel = $('[data-panel="' + n + '"]', form), ok = true, first = null;
      if (n === 2) { var e = $('[data-err="industry"]', panel); if (!val("industry")) { e.textContent = "Please select your industry."; return false; } e.textContent = ""; }
      $$("input:not([type=radio]):not([type=hidden]):not([name=website]):not([name=modules]), select", panel).forEach(function (i) { if (!checkInput(i)) { ok = false; first = first || i; } });
      if (first) first.focus();
      return ok;
    }

    function applyPlan() {
      var p = plan(val("plan")); if (!p) return;
      $$("[data-max-users]").forEach(function (b) { b.textContent = p.maxUsers; });
      $$("[data-module-chips] input").forEach(function (i) {
        var inc = p.siteModules.indexOf(i.value) !== -1;
        i.disabled = !inc; if (!inc) i.checked = false;
        i.nextElementSibling.textContent = MOD_NAMES[i.value] + (inc ? "" : " · upgrade");
      });
      if (!form.dataset.modsInit || form.dataset.modsPlan !== p.id) { $$("[data-module-chips] input:not(:disabled)").forEach(function (i) { i.checked = true; }); form.dataset.modsInit = "1"; form.dataset.modsPlan = p.id; }
      $$("[data-plan-price]").forEach(function (el) { el.textContent = priceText(plan(el.getAttribute("data-plan-price")), val("cycle") || "monthly"); });
    }
    function applyCountry() {
      var c = country(); if (!c) return;
      var cur = form.elements.currency; if (!cur.dataset.touched) cur.value = c[2];
      var pk = c[1] === "PK";
      $$("[data-method]").forEach(function (m) {
        var k = m.getAttribute("data-method"); if (k === "safepay") m.hidden = !pk;
      });
      var chosen = $('input[name=paymentMethod]:checked', form);
      if (chosen && chosen.closest("[data-method]").hidden) $('input[name=paymentMethod][value=stripe]', form).checked = true;
      applyPlan(); summary();
    }
    form.elements.currency.addEventListener("input", function () { this.dataset.touched = "1"; this.value = this.value.toUpperCase(); });

    function summary() {
      var p = plan(val("plan")), cyc = val("cycle") || "monthly";
      var set = function (k, v) { var el = $('[data-sum="' + k + '"]'); if (el) el.textContent = v || "—"; };
      set("plan", p ? p.name : ""); set("cycle", cyc === "annual" ? "Annual" : "Monthly"); set("industry", val("industry"));
      set("users", val("users")); set("site", val("subdomain") ? val("subdomain") + "." + DOMAIN : "");
      set("total", p ? (priceText(p, cyc) === "Price TBA" ? "TBA" : priceText(p, cyc)) : "TBA");
    }
    function review() {
      var p = plan(val("plan")), c = country();
      var mods = $$('[data-module-chips] input:checked').map(function (i) { return MOD_NAMES[i.value]; }).join(", ");
      var rows = [["Plan", p.name + " · " + (val("cycle") === "annual" ? "Annual" : "Monthly")], ["Price", priceText(p, val("cycle"))], ["Industry", val("industry")], ["Company", val("companyName")], ["Country", c ? c[0] : ""], ["Base currency", val("currency")], ["Users", val("users")], ["Modules", mods || "—"], ["Admin", val("fullName") + " · " + val("email")], ["ERP address", "https://" + val("subdomain") + "." + DOMAIN]];
      var dl = $("[data-review]"); dl.innerHTML = "";
      rows.forEach(function (r) { var dt = document.createElement("dt"); dt.textContent = r[0]; var dd = document.createElement("dd"); dd.textContent = r[1]; dl.appendChild(dt); dl.appendChild(dd); });
    }

    function go(n) {
      step = n;
      $$("[data-panel]", form).forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== String(n); });
      $$("[data-ind]", form).forEach(function (li) { var k = +li.getAttribute("data-ind"); li.className = k < n ? "done" : k === n ? "current" : ""; });
      btnBack.hidden = n === 1; btnNext.hidden = n === LAST; btnSubmit.hidden = n !== LAST;
      if (n === LAST) review();
      statusEl.hidden = true;
      var h = $('[data-panel="' + n + '"] h2', form); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      summary();
    }
    btnNext.addEventListener("click", function () { if (validateStep(step)) go(step + 1); });
    btnBack.addEventListener("click", function () { go(step - 1); });
    form.addEventListener("change", function (e) {
      if (e.target.name === "plan" || e.target.name === "cycle") applyPlan();
      if (e.target.name === "country") applyCountry();
      if (e.target.name === "industry") { var er = $('[data-err="industry"]'); if (er) er.textContent = ""; }
      summary();
    });
    form.addEventListener("input", function (e) { var f = e.target.closest(".field"); if (f && f.classList.contains("invalid")) checkInput(e.target); summary(); });
    $$("input, select", form).forEach(function (i) { i.addEventListener("blur", function () { if (i.value && i.type !== "radio" && i.type !== "checkbox") checkInput(i); }); });

    // Subdomain: suggest from company name, check availability
    var sub = form.elements.subdomain, subHint = $("[data-sub-hint]"), subTimer;
    form.elements.companyName.addEventListener("input", function () {
      if (sub.dataset.touched) return;
      sub.value = this.value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/^[0-9-]+/, "").slice(0, 30).replace(/-+$/, "");
    });
    sub.addEventListener("input", function () {
      sub.dataset.touched = "1"; sub.value = sub.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
      clearTimeout(subTimer); subState = { value: sub.value, ok: false, checking: true };
      if (!SUB.test(sub.value)) { subHint.textContent = "3–30 characters: lowercase letters, numbers and hyphens."; return; }
      subHint.textContent = "Checking availability…";
      subTimer = setTimeout(function () {
        var v = sub.value;
        fetchJSON(API + "/subdomain/" + encodeURIComponent(v), {}, 6000).then(function (res) {
          if (sub.value !== v) return;
          subState = { value: v, ok: !!(res.body && res.body.available), checking: false };
          subHint.textContent = subState.ok ? "✓ " + v + "." + DOMAIN + " is available" : (res.body && res.body.reason) || "This address is not available.";
          checkInput(sub);
        }).catch(function () {
          if (sub.value !== v) return;
          subState = { value: v, ok: true, checking: false };
          subHint.textContent = "Format looks good. Availability is confirmed at checkout.";
        });
      }, 450);
    });

    function show(kind, title, body) {
      statusEl.hidden = false; statusEl.className = "form-status " + kind; statusEl.innerHTML = "";
      var b = document.createElement("strong"); b.textContent = title; statusEl.appendChild(b);
      if (body) { var sp = document.createElement("span"); sp.textContent = body; statusEl.appendChild(sp); }
      statusEl.focus({ preventScroll: true }); statusEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      for (var n = 1; n <= 4; n++) { if (!validateStep(n)) { go(n); validateStep(n); return; } }
      var payload = {
        plan: val("plan"), cycle: val("cycle"), industry: val("industry"), companyName: val("companyName"),
        country: val("country"), currency: val("currency"), companySize: val("companySize"), users: parseInt(val("users"), 10),
        fyStart: val("fyStart"), taxId: val("taxId"), modules: $$('[data-module-chips] input:checked').map(function (i) { return i.value; }),
        fullName: val("fullName"), email: val("email"), phone: val("phone"), subdomain: val("subdomain"),
        terms: form.elements.terms.checked ? "yes" : "", website: val("website"), paymentMethod: val("paymentMethod")
      };
      btnSubmit.disabled = true; var txt = btnSubmit.innerHTML; btnSubmit.innerHTML = "Creating your order…";
      fetchJSON(API + "/signup", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) }, 20000)
        .then(function (res) {
          if (res.ok && res.body && res.body.ok) {
            store("volqen-order", { id: res.body.orderId, token: res.body.statusToken });
            if (res.body.checkoutUrl) { location.href = res.body.checkoutUrl; return; }
            location.href = "welcome.html#" + res.body.orderId; return;
          }
          if (res.body && res.body.errors) {
            var firstStep = null;
            Object.keys(res.body.errors).forEach(function (k) {
              var i = form.elements[k]; if (i && i.nodeType) { setErr(i, res.body.errors[k]); var pnl = i.closest("[data-panel]"); if (pnl) { var s = +pnl.getAttribute("data-panel"); firstStep = firstStep === null ? s : Math.min(firstStep, s); } }
            });
            if (firstStep !== null && firstStep !== step) go(firstStep);
          }
          show("bad", "We couldn't create your order.", (res.body && res.body.error) || "Please review your details and try again.");
          btnSubmit.disabled = false; btnSubmit.innerHTML = txt;
        })
        .catch(function () {
          if (S.demoFallback) { store("volqen-demo", payload); location.href = "welcome.html#demo"; return; }
          show("bad", "We couldn't reach the server.", "Please check your connection and try again.");
          btnSubmit.disabled = false; btnSubmit.innerHTML = txt;
        });
    });

    applyPlan(); summary();
  }

  /* ===================== WELCOME / PROVISIONING STATUS ===================== */
  var stepsEl = $("[data-steps]");
  if (stepsEl) {
    var ORDER = ["payment", "customer", "site", "setup", "permissions", "email"];
    var id = (location.hash || "").replace(/^#/, "");
    var refEl = $("[data-w-ref]");
    function paint(done, running, failed) {
      $$("li", stepsEl).forEach(function (li) {
        var k = li.getAttribute("data-k"), i = ORDER.indexOf(k);
        li.className = failed && k === running ? "fail" : i < ORDER.indexOf(done) + 1 ? "ok" : k === running ? "run" : "";
      });
    }
    function finish(url) {
      paint("email", null);
      $("[data-w-done]").hidden = false;
      $("[data-w-url]").textContent = url;
      var a = $("[data-w-open]"); a.href = url;
      $("[data-w-title]").innerHTML = 'Your ERP is <em>ready.</em>';
      $("[data-w-lead]").textContent = "We've emailed your admin login. Open your site to get started.";
    }
    if (id === "demo") {
      var d = store("volqen-demo") || { subdomain: "yourcompany" };
      $("[data-demo-note]").hidden = false; refEl.textContent = "DEMO";
      var url = "https://" + (d.subdomain || "yourcompany") + "." + DOMAIN;
      var i = 0;
      (function tick() {
        if (i >= ORDER.length) { finish(url); $("[data-w-open]").removeAttribute("target"); $("[data-w-open]").addEventListener("click", function (e) { e.preventDefault(); }); return; }
        paint(i ? ORDER[i - 1] : null, ORDER[i]); i++; setTimeout(tick, 1100);
      })();
    } else if (id) {
      refEl.textContent = id;
      var saved = store("volqen-order") || {};
      var token = saved.id === id ? saved.token : "";
      var poll = function () {
        fetchJSON(API + "/signup/" + encodeURIComponent(id) + (token ? "?t=" + encodeURIComponent(token) : ""), {}, 10000).then(function (res) {
          var o = res.body || {};
          if (!res.ok) { $("[data-w-fail]").hidden = false; return; }
          if (o.status === "awaiting_bank_transfer") { $("[data-w-bank]").hidden = false; paint(null, null); return setTimeout(poll, 15000); }
          if (o.status === "pending_payment") { paint(null, "payment"); return setTimeout(poll, 3000); }
          if (o.status === "failed") { paint(o.lastStep, o.failedStep, true); $("[data-w-fail]").hidden = false; return; }
          if (o.status === "active") { finish(o.siteUrl); return; }
          paint(o.lastStep || "payment", o.currentStep); setTimeout(poll, 2500);
        }).catch(function () { setTimeout(poll, 5000); });
      };
      poll();
    } else {
      $("[data-w-title]").textContent = "No order found";
      $("[data-w-lead]").textContent = "Start a new signup to create your ERP.";
    }
  }
})();

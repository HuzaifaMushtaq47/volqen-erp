/* Volqen ERP — site behaviour (no dependencies) */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var CFG = window.VOLQEN_CONFIG || { company: {}, forms: {}, capabilities: {} };
  var C = CFG.company || {};

  var STATUS = {
    available: "Available now",
    beta: "Early access",
    planned: "On the roadmap",
    proposed: "Pending confirmation"
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------- Toast ---------- */
  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 3600);
  }

  /* ---------- Preview banner ---------- */
  var bar = $(".preview-bar");
  if (bar && CFG.previewBanner) bar.hidden = false;

  /* ---------- Navigation ---------- */
  var header = $(".site-header");
  var toggle = $(".menu-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.style.overflow = open ? "hidden" : "";
    });
  }
  function closeMegas(except) {
    $$(".nav-link[aria-controls]").forEach(function (b) {
      if (b === except) return;
      b.setAttribute("aria-expanded", "false");
      var m = document.getElementById(b.getAttribute("aria-controls")); if (m) m.classList.remove("open");
    });
  }
  $$(".nav-link[aria-controls]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var m = document.getElementById(btn.getAttribute("aria-controls"));
      var open = btn.getAttribute("aria-expanded") !== "true";
      closeMegas(btn);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (m) m.classList.toggle("open", open);
    });
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".mega")) closeMegas(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var openBtn = $(".nav-link[aria-expanded='true']");
      closeMegas(); if (openBtn) openBtn.focus();
      if (header && header.classList.contains("nav-open")) toggle.click();
    }
  });

  /* ---------- Capability status badges ---------- */
  function statusOf(key) { var s = (CFG.capabilities || {})[key]; return STATUS[s] ? s : "proposed"; }
  $$("[data-cap]").forEach(function (el) {
    var s = statusOf(el.getAttribute("data-cap"));
    el.setAttribute("data-s", s);
    el.textContent = STATUS[s];
    el.title = "Capability status: " + STATUS[s];
  });

  /* Roadmap board */
  var board = $("[data-board]");
  var catalogEl = $("#cap-catalog");
  if (board && catalogEl) {
    var catalog = [];
    try { catalog = JSON.parse(catalogEl.textContent); } catch (e) {}
    ["available", "beta", "planned", "proposed"].forEach(function (s) {
      var col = $("[data-col='" + s + "']", board); if (!col) return;
      var items = catalog.filter(function (c) { return statusOf(c.key) === s; });
      var count = $("small", col); if (count) count.textContent = items.length;
      if (!items.length) {
        var p = document.createElement("p"); p.className = "board-empty"; p.textContent = "Nothing listed yet."; col.appendChild(p); return;
      }
      items.forEach(function (c) {
        var d = document.createElement(c.href ? "a" : "div");
        d.className = "board-item"; if (c.href) { d.href = c.href; d.style.textDecoration = "none"; d.style.color = "inherit"; }
        var b = document.createElement("b"); b.textContent = c.name;
        var sm = document.createElement("small"); sm.textContent = c.group;
        d.appendChild(b); d.appendChild(sm); col.appendChild(d);
      });
    });
  }

  /* ---------- Company details from config ---------- */
  var PENDING = "To be confirmed";
  $$("[data-config]").forEach(function (el) {
    var k = el.getAttribute("data-config");
    var v = k === "year" ? String(new Date().getFullYear()) : (C[k] || "");
    if (k === "legalName" && !v) v = C.name || "Volqen ERP";
    if (v) { el.textContent = v; el.classList.remove("pending"); }
    else { el.textContent = el.getAttribute("data-empty") || PENDING; el.classList.add("pending"); }
  });
  $$("[data-config-link]").forEach(function (el) {
    var k = el.getAttribute("data-config-link"); var v = C[k] || "";
    if (!v) { el.hidden = el.hasAttribute("data-hide-empty"); el.removeAttribute("href"); return; }
    if (k === "email") el.href = "mailto:" + v;
    else if (k === "phone") el.href = "tel:" + v.replace(/[^\d+]/g, "");
    else el.href = v;
  });

  /* Copy buttons for contact details */
  $$("[data-copy]").forEach(function (btn) {
    var v = C[btn.getAttribute("data-copy")];
    if (!v) { btn.hidden = true; return; }
    btn.addEventListener("click", function () {
      var done = function () { toast("Copied: " + v); };
      try { navigator.clipboard.writeText(v).then(done, function () { toast(v); }); } catch (e) { toast(v); }
    });
  });

  /* ---------- WhatsApp ---------- */
  function waLink(text) {
    var n = String(C.whatsapp || "").replace(/\D/g, "");
    return n ? "https://wa.me/" + n + "?text=" + encodeURIComponent(text || "Hello Volqen ERP, I would like to know more about your ERP software.") : "";
  }
  $$("[data-whatsapp]").forEach(function (el) {
    var url = waLink(el.getAttribute("data-whatsapp"));
    if (url) { el.href = url; el.target = "_blank"; el.rel = "noopener"; }
    else {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        toast("WhatsApp number is not configured yet. Please use the demo form or contact page.");
      });
    }
  });

  /* ---------- Module filter ---------- */
  var filters = $(".filters");
  if (filters) {
    filters.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      $$("button", filters).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      var f = b.getAttribute("data-filter");
      $$("[data-group]").forEach(function (card) {
        card.hidden = !(f === "all" || card.getAttribute("data-group") === f);
      });
    });
  }


  /* ---------- Scroll experience ---------- */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var prog = document.createElement("div"); prog.className = "scroll-progress"; prog.setAttribute("aria-hidden", "true"); document.body.appendChild(prog);

  // Auto-tag sections for reveal with a gentle stagger between siblings
  $$(".section .head, .section .card, .section .ind, .tier, .split > *, .cta-inner, .fact, .steps li, .systems, .marquee, .faq details, .story-step, .table-wrap").forEach(function (el) {
    if (el.closest(".mega") || el.classList.contains("reveal")) return;
    el.classList.add("reveal");
    var sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
    el.style.setProperty("--d", Math.min(sib, 6) * 0.07 + "s");
  });
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("in"); else io.observe(el);
    });
    // Safety net: never leave content hidden (e.g. print, unusual viewports)
    setTimeout(function () { reveals.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < window.innerHeight * 1.2) el.classList.add("in"); }); }, 2500);
  } else { reveals.forEach(function (el) { el.classList.add("in"); }); }

  var stage = $(".stage-inner"); var orbs = $$(".orb");
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || 0, h = document.documentElement.scrollHeight - window.innerHeight;
    prog.style.setProperty("--p", h > 0 ? (y / h).toFixed(4) : 0);
    if (header) header.classList.toggle("scrolled", y > 12);
    if (!reduce) {
      if (stage) {
        var r = stage.getBoundingClientRect(), vh = window.innerHeight;
        var t = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.75)));
        stage.style.setProperty("--tilt", (22 * (1 - t)).toFixed(2) + "deg");
        stage.style.setProperty("--sc", (0.94 + 0.06 * t).toFixed(3));
      }
      orbs.forEach(function (o, i) { o.style.transform = "translate3d(0," + (y * (0.12 + i * 0.06)).toFixed(1) + "px,0)"; });
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // Cursor spotlight on cards
  if (!reduce) {
    document.addEventListener("pointermove", function (e) {
      var c = e.target.closest && e.target.closest(".card, .ind");
      if (!c) return;
      var r = c.getBoundingClientRect();
      c.style.setProperty("--mx", (e.clientX - r.left) + "px");
      c.style.setProperty("--my", (e.clientY - r.top) + "px");
    }, { passive: true });
  }

  // Sticky scroll story
  var steps = $$(".story-step[data-step]");
  if (steps.length && "IntersectionObserver" in window) {
    var setStep = function (n) {
      steps.forEach(function (s) { s.classList.toggle("active", s.getAttribute("data-step") === n); });
      $$(".story-panel").forEach(function (p) { p.classList.toggle("active", p.getAttribute("data-step") === n); });
    };
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setStep(en.target.getAttribute("data-step")); });
    }, { rootMargin: "-45% 0px -45% 0px" });
    steps.forEach(function (s) { so.observe(s); });
    setStep(steps[0].getAttribute("data-step"));
  }

  /* ---------- Pricing: currency & billing cycle ---------- */
  var plansEl = $("#plans-data");
  var PLANS = null; try { PLANS = plansEl ? JSON.parse(plansEl.textContent) : null; } catch (e) {}
  window.VOLQEN_PLANS = PLANS;
  window.volqenPrice = function (plan, cur, cycle) {
    if (!PLANS || !plan) return null;
    var p = plan.prices && plan.prices[cur] && plan.prices[cur][cycle];
    return (p === null || p === undefined) ? null : p;
  };
  window.volqenFmt = function (cur, amount) {
    var sym = (PLANS && PLANS.currencies[cur] && PLANS.currencies[cur].symbol) || (cur + " ");
    return sym + Number(amount).toLocaleString("en-US");
  };
  var pricing = $("[data-pricing]");
  if (pricing && PLANS) {
    var state = { cur: "USD", cycle: "monthly" };
    var render = function () {
      $$("[data-tier]", pricing).forEach(function (card) {
        var plan = PLANS.plans.filter(function (p) { return p.id === card.getAttribute("data-tier"); })[0];
        var amt = window.volqenPrice(plan, state.cur, state.cycle);
        var a = $(".t-amount", card), n = $(".t-note", card);
        if (amt === null) { a.innerHTML = "TBA"; n.textContent = "Price to be announced · " + state.cur + " · billed " + state.cycle; }
        else { a.innerHTML = ""; a.appendChild(document.createTextNode(window.volqenFmt(state.cur, amt))); var sm = document.createElement("small"); sm.textContent = state.cycle === "annual" ? " /year" : " /month"; a.appendChild(sm); n.textContent = "Billed " + state.cycle + " in " + state.cur; }
      });
      $$("[data-cycle]", pricing).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-cycle") === state.cycle ? "true" : "false"); });
    };
    pricing.addEventListener("click", function (e) { var b = e.target.closest("[data-cycle]"); if (b) { state.cycle = b.getAttribute("data-cycle"); render(); } });
    var cs = $("[data-currency]", pricing); if (cs) cs.addEventListener("change", function () { state.cur = cs.value; render(); });
    render();
  }

  /* ---------- Forms ---------- */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE = /^(\+?92|0)?3\d{2}[\s-]?\d{7}$|^\+?\d[\d\s-]{7,16}$/;

  function fieldWrap(input) { return input.closest(".field"); }
  function setErr(input, msg) {
    var f = fieldWrap(input); if (!f) return;
    var e = $(".err", f);
    if (msg) { f.classList.add("invalid"); if (e) e.textContent = msg; input.setAttribute("aria-invalid", "true"); }
    else { f.classList.remove("invalid"); input.removeAttribute("aria-invalid"); }
  }
  function validateInput(input) {
    var v = (input.value || "").trim();
    var label = input.getAttribute("data-label") || "This field";
    if (input.type === "checkbox" && input.required) { setErr(input, input.checked ? "" : "Please tick this box to continue."); return input.checked; }
    if (input.required && !v) { setErr(input, label + " is required."); return false; }
    if (v && input.type === "email" && !EMAIL.test(v)) { setErr(input, "Enter a valid email address, e.g. name@company.com."); return false; }
    if (v && input.type === "tel" && !PHONE.test(v.replace(/[()]/g, ""))) { setErr(input, "Enter a valid phone number, e.g. 0300 1234567 or +92 300 1234567."); return false; }
    var min = parseInt(input.getAttribute("minlength") || "0", 10);
    if (v && min && v.length < min) { setErr(input, label + " should be at least " + min + " characters."); return false; }
    setErr(input, ""); return true;
  }

  $$("form[data-lead-form]").forEach(function (form) {
    var status = $(".form-status", form);
    var btn = $("button[type=submit]", form);
    var btnText = btn ? btn.innerHTML : "";
    var fields = $$("input:not([type=hidden]):not([name=website]), select, textarea", form);

    fields.forEach(function (i) {
      i.addEventListener("blur", function () { if (i.value || fieldWrap(i).classList.contains("invalid")) validateInput(i); });
      i.addEventListener("input", function () { if (fieldWrap(i) && fieldWrap(i).classList.contains("invalid")) validateInput(i); });
    });

    function show(kind, title, body) {
      status.hidden = false; status.className = "form-status " + kind;
      status.innerHTML = "";
      var b = document.createElement("strong"); b.textContent = title; status.appendChild(b);
      if (body) { var p = document.createElement("span"); p.textContent = body; status.appendChild(p); }
      status.scrollIntoView({ behavior: "smooth", block: "nearest" });
      status.focus({ preventScroll: true });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.hidden = true;
      var ok = true, first = null;
      fields.forEach(function (i) { if (!validateInput(i)) { ok = false; first = first || i; } });
      if (!ok) { show("bad", "Please check the highlighted fields.", "Some required information is missing or not in the right format."); first.focus(); return; }

      var data = { formType: form.getAttribute("data-lead-form"), page: location.pathname, submittedAt: new Date().toISOString() };
      new FormData(form).forEach(function (v, k) {
        if (data[k] !== undefined && k !== "formType") { data[k] = [].concat(data[k], v); }
        else data[k] = v;
      });

      btn.disabled = true; btn.innerHTML = "Sending…";
      var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
      var endpoint = (CFG.forms && CFG.forms.endpoint) || "/api/leads";

      fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(data), signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) { return { r: r, j: j }; });
        })
        .then(function (res) {
          if (res.r.ok && res.j && res.j.ok) {
            form.reset();
            var kind = data.formType === "demo" ? "demo request" : "message";
            show("ok", "Thank you — your " + kind + " has been received.", "Reference: " + (res.j.id || "—") + ". Our team will contact you using the details you provided.");
            return;
          }
          if (res.j && res.j.errors) {
            Object.keys(res.j.errors).forEach(function (k) { var i = form.elements[k]; if (i && i.nodeType) setErr(i, res.j.errors[k]); });
          }
          if (!res.r.ok && res.r.status >= 400 && res.r.status < 500 && res.j && res.j.error) { show("bad", "We couldn't submit the form.", res.j.error); return; }
          throw new Error("server");
        })
        .catch(function () {
          if (CFG.forms && CFG.forms.previewFallback) {
            show("prev", "Preview mode: your details passed validation but were not sent.", "The submission server is not running in this preview. On the deployed website this form saves the request and notifies the Volqen team.");
          } else {
            show("bad", "We couldn't send your request right now.", "Please try again in a moment, or contact us by email or WhatsApp.");
          }
        })
        .then(function () { clearTimeout(timer); btn.disabled = false; btn.innerHTML = btnText; });
    });
  });
})();

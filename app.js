const SHARE = [
  { id: "chatgpt", name: "ChatGPT", company: "OpenAI", value: 53.9, color: "#10a37f" },
  { id: "gemini", name: "Gemini", company: "Google", value: 27.9, color: "#6ea8ff" },
  { id: "claude", name: "Claude", company: "Anthropic", value: 9.2, color: "#e08a68" },
  { id: "deepseek", name: "DeepSeek", company: "DeepSeek", value: 4.1, color: "#6b7cff" },
  { id: "grok", name: "Grok", company: "xAI / SpaceX", value: 2.4, color: "#d8d4c8" },
  { id: "perplexity", name: "Perplexity", company: "Perplexity", value: 1.3, color: "#3ec8d6" },
  { id: "copilot", name: "Copilot", company: "Microsoft", value: 1.3, color: "#8b97ff" },
];

function polar(cx, cy, r, angle) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function arcPath(cx, cy, r, start, end) {
  const [x1, y1] = polar(cx, cy, r, start);
  const [x2, y2] = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

function renderPie() {
  const svg = document.getElementById("pie");
  const legend = document.getElementById("legend");
  const centerValue = document.getElementById("pie-value");
  const centerLabel = document.getElementById("pie-label");
  if (!svg || !legend) return;

  const cx = 140;
  const cy = 140;
  const r = 132;
  let angle = 0;
  const slices = [];

  SHARE.forEach((item) => {
    const sweep = (item.value / 100) * 360;
    const start = angle;
    const end = angle + sweep;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", arcPath(cx, cy, r, start, end - 0.35));
    path.setAttribute("fill", item.color);
    path.setAttribute("class", "slice");
    path.dataset.id = item.id;
    path.setAttribute("aria-label", `${item.name} ${item.value}%`);
    svg.appendChild(path);
    slices.push({ item, path });
    angle = end;

    const row = document.createElement("button");
    row.type = "button";
    row.dataset.id = item.id;
    row.innerHTML = `<i class="swatch" style="background:${item.color}"></i><span class="name">${item.name}</span><span class="pct">${item.value}%</span>`;
    legend.appendChild(row);
  });

  function select(id) {
    const selected = SHARE.find((s) => s.id === id) || SHARE[0];
    centerValue.textContent = `${selected.value}%`;
    centerLabel.textContent = selected.name;
    slices.forEach(({ item, path }) => {
      path.classList.toggle("active", item.id === selected.id);
      path.classList.toggle("dim", item.id !== selected.id);
    });
    legend.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.id === selected.id);
    });
  }

  slices.forEach(({ item, path }) => {
    path.addEventListener("mouseenter", () => select(item.id));
    path.addEventListener("focus", () => select(item.id));
    path.addEventListener("click", () => select(item.id));
  });
  legend.addEventListener("mouseover", (e) => {
    const btn = e.target.closest("button");
    if (btn) select(btn.dataset.id);
  });
  svg.addEventListener("mouseleave", () => {
    centerValue.textContent = "53.9%";
    centerLabel.textContent = "ChatGPT leads";
    slices.forEach(({ path }) => path.classList.remove("active", "dim"));
    legend.querySelectorAll("button").forEach((btn) => btn.classList.remove("active"));
  });
}

function animateBars() {
  document.querySelectorAll(".fill[data-width]").forEach((el) => {
    requestAnimationFrame(() => {
      el.style.width = el.dataset.width;
    });
  });
}

function setupFilters() {
  const chips = document.querySelectorAll(".chip");
  const cards = document.querySelectorAll(".model");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("on"));
      chip.classList.add("on");
      const key = chip.dataset.filter;
      cards.forEach((card) => {
        const tags = (card.dataset.tags || "").split(/\s+/);
        card.classList.toggle("hidden", key !== "all" && !tags.includes(key));
      });
    });
  });
}

function setupSignup() {
  const form = document.getElementById("signup-form");
  const msg = document.getElementById("form-msg");
  if (!form) return;

  // Serverless signup: the form POSTs directly to FormSubmit, which relays
  // each subscriber to the list owner's inbox. No backend is required, so this
  // works on static hosting such as GitHub Pages.
  const ENDPOINT = "https://formsubmit.co/ajax/46db9337bf9d920686ec6de927074fb2";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.classList.remove("err");
    msg.textContent = "Signing you up…";
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: data.name || "",
          email: data.email,
          _subject: "New Frontier Brief signup",
          _template: "table",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.success === "false" || body.success === false) {
        msg.classList.add("err");
        msg.textContent = (body && body.message) || "Could not sign you up. Please try again.";
        return;
      }
      msg.textContent = "You are on the list. We will email you when the briefing updates.";
      form.reset();
    } catch {
      msg.classList.add("err");
      msg.textContent = "Could not reach the signup service. Please try again.";
    }
  });
}

renderPie();
animateBars();
setupFilters();
setupSignup();

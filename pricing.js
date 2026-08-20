/* Pricing page → billing service. The service lives at BILLING_URL and must
 * list this site's origin in its BILLING_ALLOWED_ORIGINS. Prices shown in the
 * HTML are a static fallback; the live catalog overwrites them on load so the
 * page can never disagree with what checkout actually charges. */

const BILLING_URL = "https://billing.codestudioplugin.com";

const section = document.querySelector(".pricing");
const PLUGIN_ID = section.dataset.plugin;
const note = document.getElementById("checkout-note");

const say = (message, isError) => {
  note.textContent = message;
  note.classList.toggle("error", Boolean(isError));
};

const api = async (method, path, body) => {
  const response = await fetch(`${BILLING_URL}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "The billing service returned an error.");
  return data;
};

// Live prices from the catalog; buttons stay disabled if the service is down.
(async () => {
  try {
    const catalog = await api("GET", `/v1/catalog/${PLUGIN_ID}`);
    for (const plan of catalog.plans) {
      const el = document.querySelector(`[data-price="${plan.id}"]`);
      if (el && plan.price) el.textContent = `$${Math.round(plan.price / 100)}`;
    }
  } catch {
    for (const btn of document.querySelectorAll(".buy, #trial-btn")) btn.disabled = true;
    say("Checkout is briefly unavailable — refresh in a minute or email us.", true);
  }
})();

for (const button of document.querySelectorAll(".buy")) {
  button.addEventListener("click", async () => {
    button.disabled = true;
    say("Opening secure checkout…");
    try {
      const { checkout_url } = await api("POST", "/v1/checkout", {
        plugin_id: PLUGIN_ID,
        plan: button.dataset.plan,
      });
      window.location.href = checkout_url;
    } catch (err) {
      say(err.message, true);
      button.disabled = false;
    }
  });
}

document.getElementById("trial-btn").addEventListener("click", async () => {
  const email = document.getElementById("trial-email").value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    say("Enter the email address the trial licence should be issued to.", true);
    return;
  }
  const button = document.getElementById("trial-btn");
  button.disabled = true;
  say("Issuing your trial licence…");
  try {
    const trial = await api("POST", "/v1/trial", { plugin_id: PLUGIN_ID, email });
    note.innerHTML = "";
    const strong = document.createElement("strong");
    strong.textContent = trial.license_key;
    note.append("Your trial key (also keep a copy somewhere safe): ", strong,
      " — paste it into the plugin to activate. Valid until " +
      new Date(trial.expires).toLocaleDateString() + ".");
    note.classList.remove("error");
  } catch (err) {
    say(err.message, true);
    button.disabled = false;
  }
});

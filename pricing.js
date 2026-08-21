/* Pricing page → billing service. The service lives at BILLING_URL and must
 * list this site's origin in its BILLING_ALLOWED_ORIGINS. Prices shown in the
 * HTML are a static fallback; the live catalog overwrites them on load so the
 * page can never disagree with what checkout actually charges. Each .pricing
 * section sells one plugin, named by its data-plugin attribute. */

const BILLING_URL = "https://billing.codestudioplugin.com";

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

for (const section of document.querySelectorAll(".pricing")) {
  const pluginId = section.dataset.plugin;
  const note = section.querySelector(".checkout-note");

  const say = (message, isError) => {
    note.textContent = message;
    note.classList.toggle("error", Boolean(isError));
  };

  // Live prices from the catalog; buttons stay disabled if the service is down.
  (async () => {
    try {
      const catalog = await api("GET", `/v1/catalog/${pluginId}`);
      for (const plan of catalog.plans) {
        const el = section.querySelector(`[data-price="${plan.id}"]`);
        if (el && plan.price) el.textContent = `$${Math.round(plan.price / 100)}`;
      }
    } catch {
      for (const btn of section.querySelectorAll(".buy, .trial-btn")) btn.disabled = true;
      say("Checkout is briefly unavailable — refresh in a minute or email us.", true);
    }
  })();

  for (const button of section.querySelectorAll(".buy")) {
    button.addEventListener("click", async () => {
      button.disabled = true;
      say("Opening secure checkout…");
      try {
        const { checkout_url } = await api("POST", "/v1/checkout", {
          plugin_id: pluginId,
          plan: button.dataset.plan,
        });
        window.location.href = checkout_url;
      } catch (err) {
        say(err.message, true);
        button.disabled = false;
      }
    });
  }

  const trialButton = section.querySelector(".trial-btn");
  trialButton.addEventListener("click", async () => {
    const email = section.querySelector(".trial-email").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      say("Enter the email address the trial licence should be issued to.", true);
      return;
    }
    trialButton.disabled = true;
    say("Issuing your trial licence…");
    try {
      const trial = await api("POST", "/v1/trial", { plugin_id: pluginId, email });
      note.innerHTML = "";
      const strong = document.createElement("strong");
      strong.textContent = trial.license_key;
      note.append("Your trial key (also keep a copy somewhere safe): ", strong,
        " — paste it into the plugin to activate. Valid until " +
        new Date(trial.expires).toLocaleDateString() + ".");
      note.classList.remove("error");
    } catch (err) {
      say(err.message, true);
      trialButton.disabled = false;
    }
  });
}

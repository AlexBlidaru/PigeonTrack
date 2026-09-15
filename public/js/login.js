const title = document.getElementById("lp-title");
const sub = document.getElementById("lp-sub");
const errorBox = document.getElementById("lp-error");
const form = document.getElementById("lp-form");
const confirmWrap = document.getElementById("lp-confirm-wrap");
const password2 = document.getElementById("lp-password2");
const submitBtn = document.getElementById("lp-submit");

let mode = "login";

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
}

async function init() {
  try {
    const res = await fetch("/api/auth/status");
    const data = await res.json();
    if (data.authenticated) {
      window.location.href = "/";
      return;
    }
    if (data.needsSetup) {
      mode = "setup";
      title.textContent = "Bine ai venit!";
      sub.textContent = "Configureaza primul cont de administrator pentru PigeonTrack.";
      confirmWrap.hidden = false;
      password2.required = true;
      submitBtn.textContent = "Creeaza contul";
    } else {
      mode = "login";
      title.textContent = "PigeonTrack";
      sub.textContent = "Autentifica-te pentru a continua.";
    }
  } catch {
    title.textContent = "PigeonTrack";
    sub.textContent = "Autentifica-te pentru a continua.";
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.hidden = true;
  const username = document.getElementById("lp-username").value.trim();
  const password = document.getElementById("lp-password").value;

  if (mode === "setup" && password !== password2.value) {
    showError("Parolele nu coincid");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Se proceseaza...";
  try {
    const endpoint = mode === "setup" ? "/api/auth/bootstrap" : "/api/auth/login";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Eroare necunoscuta");
    window.location.href = "/";
  } catch (err) {
    showError(err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = mode === "setup" ? "Creeaza contul" : "Intra in cont";
  }
});

init();

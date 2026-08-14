const accountFormView = document.querySelector('[data-auth-view="form"]');
const signedInView = document.querySelector('[data-auth-view="signed-in"]');
const accountForm = document.querySelector(".account-form");
const nameField = document.querySelector(".account-name-field");
const passwordInput = accountForm.elements.password;
const submitButton = document.querySelector(".account-submit-button");
const formMessage = document.querySelector(".account-form-message");
const sessionMessage = document.querySelector(".account-session-message");
const userEmail = document.querySelector(".account-user-email");
const continueButton = document.querySelector(".account-continue-button");
const logoutButton = document.querySelector(".account-logout-button");
const modeButtons = [...document.querySelectorAll("[data-account-mode]")];

let accountMode = new URLSearchParams(window.location.search).get("mode") === "signup" ? "signup" : "signin";
let supabaseClient;
let accountServiceReady = false;

setAccountMode(accountMode);
initializeAccount();

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAccountMode(button.dataset.accountMode);
  });
});

accountForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  if (!accountForm.reportValidity()) {
    return;
  }

  setBusy(true);
  const email = accountForm.elements.email.value.trim();
  const password = passwordInput.value;

  try {
    if (accountMode === "signup") {
      await createAccount(email, password);
    } else {
      await signIn(email, password);
    }
  } catch (error) {
    showMessage(friendlyAuthError(error), "error");
  } finally {
    setBusy(false);
  }
});

logoutButton.addEventListener("click", async () => {
  setBusy(true);

  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      throw error;
    }
    showSignedOut();
    showMessage("You have been logged out.", "success");
  } catch (error) {
    showMessage(friendlyAuthError(error), "error");
  } finally {
    setBusy(false);
  }
});

async function initializeAccount() {
  setBusy(true);

  try {
    supabaseClient = await getSupabaseClient();
    accountServiceReady = true;
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      throw error;
    }

    if (data.session?.user) {
      showSignedIn(data.session.user);
    } else {
      showSignedOut();
    }

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        showSignedIn(session.user);
      } else {
        showSignedOut();
      }
    });
  } catch (error) {
    accountServiceReady = false;
    showSignedOut();
    showMessage(friendlyAuthError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function createAccount(email, password) {
  const displayName = accountForm.elements.displayName.value.trim();
  const redirectUrl = new URL("account.html?confirmed=1", window.location.href);
  const returnTo = safeReturnPath();

  if (returnTo) {
    redirectUrl.searchParams.set("returnTo", returnTo);
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: redirectUrl.toString()
    }
  });

  if (error) {
    throw error;
  }

  if (data.session?.user) {
    showSignedIn(data.session.user);
    followReturnPath();
    return;
  }

  accountForm.reset();
  showMessage("Check your email to confirm your account. You can return here after confirming it.", "success");
}

async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  showSignedIn(data.user);
  followReturnPath();
}

function setAccountMode(mode) {
  accountMode = mode === "signup" ? "signup" : "signin";
  const signingUp = accountMode === "signup";

  modeButtons.forEach((button) => {
    const selected = button.dataset.accountMode === accountMode;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
  });

  nameField.hidden = !signingUp;
  passwordInput.autocomplete = signingUp ? "new-password" : "current-password";
  submitButton.textContent = signingUp ? "Create account" : "Log in";
  clearMessage();
}

function showSignedIn(user) {
  accountFormView.hidden = true;
  signedInView.hidden = false;
  userEmail.textContent = user.email || "Your account";
  continueButton.href = safeReturnPath() || "emo_library.html";
}

function showSignedOut() {
  accountFormView.hidden = false;
  signedInView.hidden = true;
}

function followReturnPath() {
  const returnTo = safeReturnPath();
  if (returnTo) {
    window.location.replace(returnTo);
  }
}

function safeReturnPath() {
  const value = new URLSearchParams(window.location.search).get("returnTo");
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "";
  }
  return value;
}

function setBusy(busy) {
  submitButton.disabled = busy || !accountServiceReady;
  logoutButton.disabled = busy || !accountServiceReady;
  modeButtons.forEach((button) => {
    button.disabled = busy;
  });
}

function showMessage(message, type) {
  formMessage.textContent = message;
  formMessage.dataset.type = type;
  sessionMessage.textContent = message;
  sessionMessage.dataset.type = type;
}

function clearMessage() {
  showMessage("", "");
}

function friendlyAuthError(error) {
  const message = String(error?.message || "Something went wrong. Please try again.");
  if (message.toLowerCase().includes("invalid login credentials")) {
    return "That email and password did not match. Please try again.";
  }
  if (message.toLowerCase().includes("email not confirmed")) {
    return "Please confirm your email before logging in.";
  }
  return message;
}

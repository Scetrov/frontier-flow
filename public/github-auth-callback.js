const rawPayload = document.body.dataset.authPayload ?? "";

let payload = {
  type: "ff:github-auth:error",
  reason: "exchange_failed",
  message: "GitHub sign-in callback did not include a result payload.",
};

if (rawPayload.length > 0) {
  try {
    payload = JSON.parse(decodeURIComponent(rawPayload));
  } catch {
    payload = {
      type: "ff:github-auth:error",
      reason: "exchange_failed",
      message: "GitHub sign-in returned an invalid callback payload.",
    };
  }
}

if (window.opener && !window.opener.closed) {
  window.opener.postMessage(payload, window.location.origin);
}

window.close();
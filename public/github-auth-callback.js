const rawPayload = document.body.dataset.authPayload ?? "";

let payload = null;

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

if (window.opener && !window.opener.closed && payload !== null) {
  window.opener.postMessage(payload, window.location.origin);
}

window.close();
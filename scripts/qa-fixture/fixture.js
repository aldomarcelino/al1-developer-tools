const state = document.getElementById("state");
const results = document.getElementById("results");
const secret = "DUMMY_CAPTURE_SECRET";
async function send(path, options) {
  try {
    const response = await fetch(path, options);
    const text = await response.text();
    return `${path}: HTTP ${response.status}, ${text.length} characters`;
  } catch {
    return `${path}: expected network failure`;
  }
}
const post = () =>
  send("/api/post", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
      "x-correlation-id": "fixture-correlation-01",
    },
    body: JSON.stringify({
      customer: { email: "qa@example.test", password: secret },
      quantity: 2,
      note: 'café 日本語\n"quote" \' ` $(echo unsafe) $HOME',
    }),
  });
document.getElementById("single").onclick = async () => {
  results.textContent = await post();
  state.textContent = "Checkout request completed. Add a bug marker in DevTools.";
};
document.getElementById("pending").onclick = async () => {
  state.textContent =
    "Pending request started; stop capture before six seconds to test the boundary.";
  results.textContent = await send("/api/pending");
};
document.getElementById("run").onclick = async () => {
  state.textContent = "Running…";
  results.textContent = "";
  const lines = [];
  for (const job of [
    () =>
      send(
        "/api/ok?tag=one&tag=two&token=" +
          secret +
          "&note=" +
          encodeURIComponent("quote' ` $(echo nope) 日本語")
      ),
    post,
    () =>
      send("/api/form", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          name: "QA Unicode café",
          password: secret,
          note: "line1\nline2",
        }),
      }),
    ...[
      "business",
      "bad",
      "error",
      "empty",
      "invalid-json",
      "html",
      "slow",
      "failure",
      "redirect",
      "large",
      "binary",
      "invalid-trace",
      "no-identifiers",
    ].map((name) => () => send("/api/" + name)),
  ]) {
    lines.push(await job());
    results.textContent = lines.join("\n");
  }
  state.textContent =
    "Scenario complete. Mark the bug in Ramupod QA, then Stop and Export.";
};

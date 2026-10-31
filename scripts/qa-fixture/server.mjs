import http from "node:http";
import { readFile } from "node:fs/promises";
const secret = "DUMMY_CAPTURE_SECRET";
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:3891");
  if (url.pathname === "/" || url.pathname === "/second") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(await readFile(new URL("index.html", import.meta.url)));
    return;
  }
  if (url.pathname === "/fixture.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(await readFile(new URL("fixture.js", import.meta.url)));
    return;
  }
  if (url.pathname === "/favicon.ico") {
    res.writeHead(204).end();
    return;
  }
  if (!url.pathname.startsWith("/api/")) {
    res.writeHead(404).end();
    return;
  }
  let input = "";
  for await (const chunk of req) input += chunk;
  const name = url.pathname.split("/").pop();
  if (name !== "no-identifiers") res.setHeader("x-request-id", `fixture-${name}`);
  if (name === "invalid-trace")
    res.setHeader("traceparent", "00-not-a-valid-traceparent");
  else if (name !== "no-identifiers")
    res.setHeader(
      "traceparent",
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
    );
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (name === "slow") await new Promise((resolve) => setTimeout(resolve, 900));
  if (name === "failure") {
    req.socket.destroy();
    return;
  }
  if (name === "pending") {
    await new Promise((resolve) => setTimeout(resolve, 6000));
  }
  if (name === "redirect") {
    res.writeHead(302, { Location: "/api/ok?from=redirect" }).end();
    return;
  }
  if (name === "empty") {
    res.writeHead(204).end();
    return;
  }
  if (name === "invalid-json") {
    res.end('{"broken":');
    return;
  }
  if (name === "html") {
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      '<html><body><h1>Fixture error</h1><script>throw new Error("must stay inert in viewer")</script></body></html>'
    );
    return;
  }
  if (name === "large") {
    res.end(JSON.stringify({ token: secret, padding: "x".repeat(140000) }));
    return;
  }
  if (name === "binary") {
    res.writeHead(200, { "Content-Type": "application/octet-stream" });
    res.end(Buffer.from([0, 1, 2, 3, 255]));
    return;
  }
  if (name === "post")
    res.setHeader("Set-Cookie", `fixture_token=${secret}; Path=/; SameSite=Lax`);
  const payload = {
    ok: !["business", "bad", "error"].includes(name),
    ...(name === "business"
      ? { success: false, error: { code: "PAYMENT_DECLINED" } }
      : {}),
    ...(name === "no-identifiers"
      ? {}
      : { requestId: `body-${name}`, traceId: "body-fixture-trace" }),
    method: req.method,
    query: [...url.searchParams],
    received: input,
    token: secret,
    note: "Unicode: café 日本語\nquotes: \" ' ` $(touch /tmp/SHOULD_NOT_EXIST) $HOME",
  };
  res.statusCode = name === "bad" ? 400 : name === "error" ? 500 : 200;
  res.end(JSON.stringify(payload));
});
server.listen(3891, "127.0.0.1", () =>
  console.log("QA fixture: http://127.0.0.1:3891 (synthetic secrets only)")
);

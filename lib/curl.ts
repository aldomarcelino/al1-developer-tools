/**
 * Client-Side cURL Command Parser and Multi-Language Code Generator Engine
 * Converts cURL commands into equivalent HTTP code for JavaScript, TypeScript, Python, PHP, and Go.
 * Detects unsupported cURL flags transparently.
 * NEVER executes the cURL command.
 */

export type CodeTarget =
  "js-fetch" | "js-axios" | "ts-fetch" | "python-requests" | "php-curl" | "go-http";

export interface TargetOption {
  value: CodeTarget;
  label: string;
  language: string;
  extension: string;
}

export const TARGET_OPTIONS: TargetOption[] = [
  {
    value: "js-fetch",
    label: "JavaScript Fetch",
    language: "javascript",
    extension: ".js",
  },
  {
    value: "js-axios",
    label: "JavaScript Axios",
    language: "javascript",
    extension: ".js",
  },
  {
    value: "ts-fetch",
    label: "TypeScript Fetch",
    language: "typescript",
    extension: ".ts",
  },
  {
    value: "python-requests",
    label: "Python Requests",
    language: "python",
    extension: ".py",
  },
  { value: "php-curl", label: "PHP cURL", language: "php", extension: ".php" },
  { value: "go-http", label: "Go net/http", language: "go", extension: ".go" },
];

export interface ParsedCurl {
  url: string;
  method: string;
  headers: Record<string, string>;
  data?: string;
  isJsonBody: boolean;
  basicAuth?: { username: string; password?: string };
  followRedirects: boolean;
  insecure: boolean;
  compressed: boolean;
  unsupportedFlags: string[];
}

export interface CurlConvertResult {
  success: boolean;
  code: string;
  parsed?: ParsedCurl;
  error?: string;
  warnings: string[];
  executionTimeMs: number;
}

export const sampleCurlCommands = {
  jsonPost: `curl -X POST https://api.example.com/v1/users \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sec_live_9948abc123" \\
  -H "X-Client-ID: al1-web-client" \\
  -d '{
    "name": "Sarah Connor",
    "email": "sarah@resistance.org",
    "role": "admin"
  }'`,

  getWithQuery: `curl -X GET "https://api.github.com/repos/aldomarcelino/al1-developer-tools/issues?state=open&sort=created&direction=desc" \\
  -H "Accept: application/vnd.github.v3+json" \\
  -H "User-Agent: Al1-Developer-Tools" \\
  -L`,

  basicAuthForm: `curl -X PUT https://api.payments.net/v2/subscriptions/sub_4410 \\
  -u "api_key_sandbox:sec_pass_xyz890" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  --data "plan=pro_annual&seats=5&auto_renew=true"`,
};

/**
 * Tokenizes a shell command string respecting quotes and escaping
 */
function tokenizeShellCommand(cmd: string): string[] {
  // Normalize multi-line continuation with backslash or caret
  const cleaned = cmd
    .replace(/\\\r?\n/g, " ")
    .replace(/\^\r?\n/g, " ")
    .replace(/^\s*\$\s*curl/i, "curl")
    .trim();

  const tokens: string[] = [];
  let i = 0;
  const len = cleaned.length;

  while (i < len) {
    while (i < len && /\s/.test(cleaned[i])) i++;
    if (i >= len) break;

    const char = cleaned[i];

    // Single quoted string
    if (char === "'") {
      let val = "";
      i++;
      while (i < len && cleaned[i] !== "'") {
        if (cleaned[i] === "\\" && cleaned[i + 1] === "'") {
          val += "'";
          i += 2;
        } else {
          val += cleaned[i];
          i++;
        }
      }
      i++; // skip closing quote
      tokens.push(val);
      continue;
    }

    // Double quoted string
    if (char === '"') {
      let val = "";
      i++;
      while (i < len && cleaned[i] !== '"') {
        if (cleaned[i] === "\\" && i + 1 < len) {
          val += cleaned[i + 1];
          i += 2;
        } else {
          val += cleaned[i];
          i++;
        }
      }
      i++; // skip closing quote
      tokens.push(val);
      continue;
    }

    // Unquoted token
    let val = "";
    while (i < len && !/\s/.test(cleaned[i])) {
      if (cleaned[i] === "\\" && i + 1 < len) {
        val += cleaned[i + 1];
        i += 2;
      } else {
        val += cleaned[i];
        i++;
      }
    }
    tokens.push(val);
  }

  return tokens;
}

/**
 * Parses raw cURL command into a structured HTTP request model
 */
export function parseCurl(command: string): { parsed?: ParsedCurl; error?: string } {
  const trimmed = command.trim();
  if (!trimmed) {
    return { error: "Empty command input." };
  }

  const tokens = tokenizeShellCommand(trimmed);
  if (tokens.length === 0) {
    return { error: "No arguments found in cURL command." };
  }

  // Skip leading 'curl' if present
  let startIdx = 0;
  if (tokens[0].toLowerCase() === "curl") {
    startIdx = 1;
  }

  let url = "";
  let method = "";
  const headers: Record<string, string> = {};
  const dataParts: string[] = [];
  let basicAuth: { username: string; password?: string } | undefined;
  let followRedirects = false;
  let insecure = false;
  let compressed = false;
  const unsupportedFlags: string[] = [];

  const unsupportedList = new Set([
    "--cert",
    "--key",
    "--cacert",
    "--proxy",
    "--socks5",
    "--limit-rate",
    "--cookie",
    "-b",
    "--cookie-jar",
    "-c",
    "--resolve",
    "--interface",
    "--retry",
    "--parallel",
  ]);

  for (let i = startIdx; i < tokens.length; i++) {
    const token = tokens[i];

    // Method: -X, --request
    if (token === "-X" || token === "--request") {
      if (i + 1 < tokens.length) {
        method = tokens[++i].toUpperCase();
      }
      continue;
    }

    // Headers: -H, --header
    if (token === "-H" || token === "--header") {
      if (i + 1 < tokens.length) {
        const headerStr = tokens[++i];
        const colonIdx = headerStr.indexOf(":");
        if (colonIdx > 0) {
          const key = headerStr.slice(0, colonIdx).trim();
          const val = headerStr.slice(colonIdx + 1).trim();
          headers[key] = val;
        }
      }
      continue;
    }

    // Data / Body: -d, --data, --data-raw, --data-binary, --data-urlencode
    if (
      token === "-d" ||
      token === "--data" ||
      token === "--data-raw" ||
      token === "--data-binary" ||
      token === "--data-urlencode"
    ) {
      if (i + 1 < tokens.length) {
        dataParts.push(tokens[++i]);
      }
      continue;
    }

    // Form data: -F, --form
    if (token === "-F" || token === "--form") {
      if (i + 1 < tokens.length) {
        dataParts.push(tokens[++i]);
        if (!headers["Content-Type"]) {
          headers["Content-Type"] = "multipart/form-data";
        }
      }
      continue;
    }

    // Basic Auth: -u, --user
    if (token === "-u" || token === "--user") {
      if (i + 1 < tokens.length) {
        const creds = tokens[++i];
        const [u, ...p] = creds.split(":");
        basicAuth = { username: u, password: p.join(":") };
      }
      continue;
    }

    // Flags
    if (token === "-L" || token === "--location") {
      followRedirects = true;
      continue;
    }
    if (token === "-k" || token === "--insecure") {
      insecure = true;
      continue;
    }
    if (token === "--compressed") {
      compressed = true;
      continue;
    }

    // Check for unsupported flags
    if (unsupportedList.has(token)) {
      unsupportedFlags.push(token);
      // Skip argument value if not a boolean flag
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith("-")) {
        i++;
      }
      continue;
    }

    // URL (anything without leading -)
    if (!token.startsWith("-") && !url) {
      url = token;
      continue;
    }
  }

  if (!url) {
    return { error: "Could not find a valid target URL in the cURL command." };
  }

  // Normalize URL (prepend https:// if protocol missing)
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  // Combine data parts
  const rawData = dataParts.length > 0 ? dataParts.join("&") : undefined;

  // Infer method if not explicitly specified: POST if data is provided, otherwise GET
  if (!method) {
    method = rawData ? "POST" : "GET";
  }

  // Check if body is valid JSON
  let isJsonBody = false;
  if (rawData) {
    try {
      JSON.parse(rawData);
      isJsonBody = true;
      if (!headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }
    } catch {
      isJsonBody = false;
    }
  }

  return {
    parsed: {
      url,
      method,
      headers,
      data: rawData,
      isJsonBody,
      basicAuth,
      followRedirects,
      insecure,
      compressed,
      unsupportedFlags,
    },
  };
}

// -------------------------------------------------------------
// CODE GENERATORS FOR EACH TARGET
// -------------------------------------------------------------

function generateJsFetch(parsed: ParsedCurl): string {
  const { url, method, headers, data, isJsonBody, basicAuth } = parsed;

  const headerObj = { ...headers };
  if (basicAuth) {
    const encoded = Buffer.from(
      `${basicAuth.username}:${basicAuth.password || ""}`
    ).toString("base64");
    headerObj["Authorization"] = `Basic ${encoded}`;
  }

  const options: string[] = [];
  options.push(`  method: "${method}",`);

  if (Object.keys(headerObj).length > 0) {
    const formattedHeaders = Object.entries(headerObj)
      .map(([k, v]) => `    "${k}": "${v.replace(/"/g, '\\"')}"`)
      .join(",\n");
    options.push(`  headers: {\n${formattedHeaders}\n  },`);
  }

  if (data && method !== "GET" && method !== "HEAD") {
    if (isJsonBody) {
      try {
        const parsedJson = JSON.parse(data);
        const prettyJson = JSON.stringify(parsedJson, null, 2)
          .split("\n")
          .map((line, idx) => (idx === 0 ? line : `    ${line}`))
          .join("\n");
        options.push(`  body: JSON.stringify(${prettyJson}),`);
      } catch {
        options.push(`  body: ${JSON.stringify(data)},`);
      }
    } else {
      options.push(`  body: ${JSON.stringify(data)},`);
    }
  }

  return `// JavaScript (Fetch API)
async function sendRequest() {
  const url = "${url}";
  const options = {
${options.join("\n")}
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    console.log("Success:", data);
    return data;
  } catch (error) {
    console.error("Request failed:", error);
    throw error;
  }
}

sendRequest();`;
}

function generateJsAxios(parsed: ParsedCurl): string {
  const { url, method, headers, data, isJsonBody, basicAuth } = parsed;

  const headerObj = { ...headers };
  const lines: string[] = [
    `import axios from "axios";`,
    ``,
    `async function sendRequest() {`,
    `  const config = {`,
    `    method: "${method.toLowerCase()}",`,
    `    url: "${url}",`,
  ];

  if (Object.keys(headerObj).length > 0) {
    const headerLines = Object.entries(headerObj)
      .map(([k, v]) => `      "${k}": "${v.replace(/"/g, '\\"')}"`)
      .join(",\n");
    lines.push(`    headers: {\n${headerLines}\n    },`);
  }

  if (basicAuth) {
    lines.push(`    auth: {`);
    lines.push(`      username: "${basicAuth.username}",`);
    lines.push(`      password: "${basicAuth.password || ""}"`);
    lines.push(`    },`);
  }

  if (data && method !== "GET" && method !== "HEAD") {
    if (isJsonBody) {
      try {
        const parsedJson = JSON.parse(data);
        const pretty = JSON.stringify(parsedJson, null, 2)
          .split("\n")
          .map((l, i) => (i === 0 ? l : `      ${l}`))
          .join("\n");
        lines.push(`    data: ${pretty},`);
      } catch {
        lines.push(`    data: ${JSON.stringify(data)},`);
      }
    } else {
      lines.push(`    data: ${JSON.stringify(data)},`);
    }
  }

  lines.push(`  };`);
  lines.push(``);
  lines.push(`  try {`);
  lines.push(`    const response = await axios(config);`);
  lines.push(`    console.log("Response data:", response.data);`);
  lines.push(`    return response.data;`);
  lines.push(`  } catch (error) {`);
  lines.push(`    console.error("Axios error:", error);`);
  lines.push(`    throw error;`);
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`sendRequest();`);

  return lines.join("\n");
}

function generateTsFetch(parsed: ParsedCurl): string {
  const { url, method, headers, data, isJsonBody, basicAuth } = parsed;

  const headerObj = { ...headers };
  if (basicAuth) {
    const encoded = Buffer.from(
      `${basicAuth.username}:${basicAuth.password || ""}`
    ).toString("base64");
    headerObj["Authorization"] = `Basic ${encoded}`;
  }

  const options: string[] = [];
  options.push(`    method: "${method}",`);

  if (Object.keys(headerObj).length > 0) {
    const formattedHeaders = Object.entries(headerObj)
      .map(([k, v]) => `      "${k}": "${v.replace(/"/g, '\\"')}"`)
      .join(",\n");
    options.push(`    headers: {\n${formattedHeaders}\n    },`);
  }

  if (data && method !== "GET" && method !== "HEAD") {
    if (isJsonBody) {
      try {
        const parsedJson = JSON.parse(data);
        const prettyJson = JSON.stringify(parsedJson, null, 2)
          .split("\n")
          .map((line, idx) => (idx === 0 ? line : `      ${line}`))
          .join("\n");
        options.push(`    body: JSON.stringify(${prettyJson}),`);
      } catch {
        options.push(`    body: ${JSON.stringify(data)},`);
      }
    } else {
      options.push(`    body: ${JSON.stringify(data)},`);
    }
  }

  return `// TypeScript (Fetch API)
interface ApiResponse<T = unknown> {
  data: T;
  status: number;
}

async function sendRequest<T = unknown>(): Promise<T> {
  const url = "${url}";
  const init: RequestInit = {
${options.join("\n")}
  };

  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
  }

  return (await response.json()) as T;
}

sendRequest().then((data) => console.log(data));`;
}

function generatePythonRequests(parsed: ParsedCurl): string {
  const { url, method, headers, data, isJsonBody, basicAuth } = parsed;

  const lines: string[] = [`import requests`, ``];
  lines.push(`url = "${url}"`);

  if (Object.keys(headers).length > 0) {
    lines.push(`headers = {`);
    for (const [k, v] of Object.entries(headers)) {
      lines.push(`    "${k}": "${v.replace(/"/g, '\\"')}",`);
    }
    lines.push(`}`);
  } else {
    lines.push(`headers = {}`);
  }

  if (basicAuth) {
    lines.push(`auth = ("${basicAuth.username}", "${basicAuth.password || ""}")`);
  }

  let dataArg = "";
  if (data && method !== "GET" && method !== "HEAD") {
    if (isJsonBody) {
      try {
        const parsedJson = JSON.parse(data);
        const pretty = JSON.stringify(parsedJson, null, 4)
          .replace(/: true/g, ": True")
          .replace(/: false/g, ": False")
          .replace(/: null/g, ": None");
        lines.push(`payload = ${pretty}`);
        dataArg = ", json=payload";
      } catch {
        lines.push(`payload = """${data}"""`);
        dataArg = ", data=payload";
      }
    } else {
      lines.push(`payload = """${data}"""`);
      dataArg = ", data=payload";
    }
  }

  const authArg = basicAuth ? ", auth=auth" : "";
  lines.push(``);
  lines.push(`response = requests.request(`);
  lines.push(`    method="${method}",`);
  lines.push(`    url=url,`);
  lines.push(`    headers=headers${authArg}${dataArg}`);
  lines.push(`)`);
  lines.push(``);
  lines.push(`print(f"Status Code: {response.status_code}")`);
  lines.push(`print(response.text)`);

  return lines.join("\n");
}

function generatePhpCurl(parsed: ParsedCurl): string {
  const { url, method, headers, data, basicAuth } = parsed;

  const headerList = Object.entries(headers).map(
    ([k, v]) => `        "${k}: ${v.replace(/"/g, '\\"')}"`
  );
  if (basicAuth) {
    const encoded = Buffer.from(
      `${basicAuth.username}:${basicAuth.password || ""}`
    ).toString("base64");
    headerList.push(`        "Authorization: Basic ${encoded}"`);
  }

  const lines: string[] = [
    `<?php`,
    `$curl = curl_init();`,
    ``,
    `curl_setopt_array($curl, [`,
    `    CURLOPT_URL => "${url}",`,
    `    CURLOPT_RETURNTRANSFER => true,`,
    `    CURLOPT_ENCODING => "",`,
    `    CURLOPT_MAXREDIRS => 10,`,
    `    CURLOPT_TIMEOUT => 30,`,
    `    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,`,
    `    CURLOPT_CUSTOMREQUEST => "${method}",`,
  ];

  if (headerList.length > 0) {
    lines.push(`    CURLOPT_HTTPHEADER => [`);
    lines.push(headerList.join(",\n"));
    lines.push(`    ],`);
  }

  if (data && method !== "GET" && method !== "HEAD") {
    lines.push(`    CURLOPT_POSTFIELDS => '${data.replace(/'/g, "\\'")}',`);
  }

  lines.push(`]);`);
  lines.push(``);
  lines.push(`$response = curl_exec($curl);`);
  lines.push(`$err = curl_error($curl);`);
  lines.push(``);
  lines.push(`curl_close($curl);`);
  lines.push(``);
  lines.push(`if ($err) {`);
  lines.push(`    echo "cURL Error #: " . $err;`);
  lines.push(`} else {`);
  lines.push(`    echo $response;`);
  lines.push(`}`);

  return lines.join("\n");
}

function generateGoHttp(parsed: ParsedCurl): string {
  const { url, method, headers, data, basicAuth } = parsed;

  const lines: string[] = [
    `package main`,
    ``,
    `import (`,
    `\t"fmt"`,
    `\t"io"`,
    `\t"net/http"`,
  ];

  if (data && method !== "GET" && method !== "HEAD") {
    lines.push(`\t"strings"`);
  }
  lines.push(`)`);
  lines.push(``);
  lines.push(`func main() {`);
  lines.push(`\turl := "${url}"`);

  if (data && method !== "GET" && method !== "HEAD") {
    lines.push(
      `\tpayload := strings.NewReader(\`${data.replace(/`/g, '` + "`" + `')}\`)`
    );
    lines.push(`\treq, err := http.NewRequest("${method}", url, payload)`);
  } else {
    lines.push(`\treq, err := http.NewRequest("${method}", url, nil)`);
  }

  lines.push(`\tif err != nil {`);
  lines.push(`\t\tpanic(err)`);
  lines.push(`\t}`);
  lines.push(``);

  for (const [k, v] of Object.entries(headers)) {
    lines.push(`\treq.Header.Add("${k}", "${v.replace(/"/g, '\\"')}")`);
  }

  if (basicAuth) {
    lines.push(
      `\treq.SetBasicAuth("${basicAuth.username}", "${basicAuth.password || ""}")`
    );
  }

  lines.push(``);
  lines.push(`\tclient := &http.Client{}`);
  lines.push(`\tresp, err := client.Do(req)`);
  lines.push(`\tif err != nil {`);
  lines.push(`\t\tpanic(err)`);
  lines.push(`\t}`);
  lines.push(`\tdefer resp.Body.Close()`);
  lines.push(``);
  lines.push(`\tbody, err := io.ReadAll(resp.Body)`);
  lines.push(`\tif err != nil {`);
  lines.push(`\t\tpanic(err)`);
  lines.push(`\t}`);
  lines.push(``);
  lines.push(`\tfmt.Println(resp.Status)`);
  lines.push(`\tfmt.Println(string(body))`);
  lines.push(`}`);

  return lines.join("\n");
}

/**
 * Main cURL to Code Converter Function
 */
export function convertCurl(
  command: string,
  target: CodeTarget = "js-fetch"
): CurlConvertResult {
  const startTime = performance.now();
  const trimmed = command.trim();

  if (!trimmed) {
    return {
      success: true,
      code: "",
      warnings: [],
      executionTimeMs: 0,
    };
  }

  const parseResult = parseCurl(trimmed);
  if (parseResult.error || !parseResult.parsed) {
    return {
      success: false,
      code: "",
      error: parseResult.error || "Failed to parse cURL command.",
      warnings: [],
      executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
    };
  }

  const parsed = parseResult.parsed;
  const warnings: string[] = [];

  if (parsed.unsupportedFlags.length > 0) {
    warnings.push(
      `Unsupported cURL options ignored: ${parsed.unsupportedFlags.join(", ")}`
    );
  }

  let code = "";
  switch (target) {
    case "js-fetch":
      code = generateJsFetch(parsed);
      break;
    case "js-axios":
      code = generateJsAxios(parsed);
      break;
    case "ts-fetch":
      code = generateTsFetch(parsed);
      break;
    case "python-requests":
      code = generatePythonRequests(parsed);
      break;
    case "php-curl":
      code = generatePhpCurl(parsed);
      break;
    case "go-http":
      code = generateGoHttp(parsed);
      break;
    default:
      code = generateJsFetch(parsed);
  }

  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    success: true,
    code,
    parsed,
    warnings,
    executionTimeMs,
  };
}

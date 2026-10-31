import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { optimizeSvg } from "./optimize-svg.ts";
import { defaultOptions, sampleSvg, svgLimits, type SvgOptions } from "./options.ts";
const run = (source = sampleSvg, patch: Partial<SvgOptions> = {}) =>
  optimizeSvg({
    source,
    options: { ...defaultOptions, ...patch },
    componentName: "SampleIcon",
  });
const off: SvgOptions = {
  instructions: false,
  metadata: false,
  empty: false,
  groups: false,
  numbers: false,
  precision: 3,
  responsive: false,
  currentColor: false,
};
const wrap = (body: string, attrs = 'viewBox="0 0 24 24"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${attrs}>${body}</svg>`;
test("sample cleanup reduces bytes, preserves accessibility text and viewBox", () => {
  const result = run();
  assert.ok(result.optimizedBytes < result.originalBytes);
  assert.equal(result.originalDimensions.width, "240");
  assert.equal(result.optimizedDimensions.viewBox, "0 0 240 240");
  assert.equal(result.optimizedDimensions.width, "");
  for (const pattern of [/<!DOCTYPE/, /<\?xml/, /<!--/, /<metadata/, /<g>/])
    assert.doesNotMatch(result.optimized, pattern);
  assert.match(result.optimized, /<title>Folded layers<\/title>/);
  assert.equal(result.originalBytes, new TextEncoder().encode(sampleSvg).length);
});
test("each cleanup toggle can be disabled independently", () => {
  const unchanged = optimizeSvg({
    source: sampleSvg,
    options: off,
    componentName: "SampleIcon",
  }).optimized;
  assert.match(unchanged, /<\?xml/);
  assert.match(unchanged, /<!DOCTYPE/);
  assert.match(unchanged, /<!--/);
  assert.match(unchanged, /<metadata>/);
  assert.match(unchanged, /<g>/);
  assert.match(unchanged, /99\.987654/);
  assert.match(unchanged, /width="240"/);
  assert.match(run(sampleSvg, { instructions: false }).optimized, /<!DOCTYPE/);
  assert.match(run(sampleSvg, { metadata: false }).optimized, /<metadata>/);
  assert.match(run(sampleSvg, { groups: false }).optimized, /<g>/);
  assert.match(
    run(wrap('<g/><rect width="1" height="1" class=""/>'), {
      empty: false,
      groups: false,
    }).optimized,
    /<g\/>/
  );
  assert.match(
    run(wrap('<rect width="1" height="1" class=""/>'), { empty: false }).optimized,
    /class=""/
  );
});
test("numeric and path precision respects slider limits", () => {
  const source = wrap(
    '<path d="M1.123456 2.123456L3.987654 4.987654"/><circle cx="5.123456" cy="5" r="1"/>'
  );
  const low = run(source, { precision: 1 }).optimized,
    high = run(source, { precision: 5 }).optimized;
  assert.match(low, /cx="5\.1"/);
  assert.match(high, /cx="5\.12346"/);
  assert.notEqual(low, high);
  assert.match(run(source, { numbers: false }).optimized, /1\.123456/);
  assert.throws(() => run(source, { precision: 6 }), /precision/);
});
test("responsive SVG infers numeric and px dimensions, preserving unknown units", () => {
  assert.equal(
    run(wrap('<rect width="24" height="12"/>', 'width="24px" height="12px"'), {
      numbers: false,
    }).optimizedDimensions.viewBox,
    "0 0 24 12"
  );
  const unknown = run(wrap('<path d="M0 0L1 1"/>', 'width="100%" height="2em"'));
  assert.equal(unknown.optimizedDimensions.width, "100%");
  assert.ok(unknown.warnings.some((text) => /Responsive/.test(text)));
  assert.equal(run(sampleSvg, { responsive: false }).optimizedDimensions.width, "240");
  assert.throws(() => run(wrap("", 'viewBox="0 0 -2 4"')), /viewBox/);
});
test("currentColor changes solid fill/stroke, preserving none, gradients, variables and transparency", () => {
  const result = run(
    wrap(
      '<style>.icon{fill:#ff0000;stroke:blue}</style><defs><linearGradient id="g"><stop stop-color="#fff"/></linearGradient></defs><path fill="red" stroke="rgb(0,0,0)" d="M0 0L1 1"/><path fill="none" stroke="transparent"/><path fill="url(#g)"/><path style="fill:var(--icon);stroke:#fff;--icon:red"/>'
    ),
    { currentColor: true }
  ).optimized;
  assert.match(result, /fill="currentColor"/);
  assert.match(result, /stroke="currentColor"/);
  assert.match(result, /fill="none"/);
  assert.match(result, /stroke="transparent"/);
  assert.match(result, /fill="url\(#g\)"/);
  assert.match(result, /fill:var\(--icon\)/);
  assert.match(result, /--icon:red/);
  assert.match(result, /stop-color="#fff"/);
  assert.match(result, /\.icon\{fill:currentColor;stroke:currentColor\}/);
});
test("React JSX/TSX output handles attributes, inline styles, text and props without code injection", () => {
  const result = run(
    wrap(
      '<title>hello {world} &amp; é 🦊</title><path class="a" aria-label="shape" data-id="1" stroke-width="2" stroke-linecap="round" style="fill:red;stroke-width:2;--icon-color:blue"/><use xlink:href="#shape"/>'
    )
  );
  for (const format of ["jsx", "tsx"] as const) {
    assert.match(result.exports[format], /className=/);
    assert.match(result.exports[format], /strokeWidth=/);
    assert.match(result.exports[format], /strokeLinecap=/);
    assert.match(result.exports[format], /xlinkHref=/);
    assert.match(result.exports[format], /aria-label=/);
    assert.match(result.exports[format], /data-id=/);
    assert.match(result.exports[format], /\.\.\.props/);
    assert.match(result.exports[format], /"strokeWidth": "2"/);
    assert.match(result.exports[format], /"--icon-color": "blue"/);
    const compilation = ts.transpileModule(result.exports[format], {
      fileName: `test.${format}`,
      reportDiagnostics: true,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext },
    });
    assert.equal(
      compilation.diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error)
        .length,
      0
    );
  }
  assert.match(result.exports.tsx, /SVGProps<SVGSVGElement>/);
  assert.match(result.exports.vue, /<svg v-pre|<svg[^>]* v-pre/);
});
test("UTF-8 and Base64 Data URIs round trip Unicode SVG and CSS-sensitive characters", () => {
  const result = run(wrap("<text>é 🦊 (test) ' quote</text>"));
  assert.equal(decodeURIComponent(result.exports.uri.split(",")[1]), result.optimized);
  assert.equal(
    new TextDecoder().decode(
      Uint8Array.from(atob(result.exports.base64.split(",")[1]), (c) => c.charCodeAt(0))
    ),
    result.optimized
  );
  assert.doesNotMatch(result.exports.uri.split(",")[1], /['()]/);
});
test("active nodes, handlers, external references, directives and unsafe CSS never reach previews or exports", () => {
  const source = `<?xml-stylesheet href="https://evil.test/a.css"?>${wrap('<script>alert(1)</script><foreignObject><div>html</div></foreignObject><animate attributeName="href" to="javascript:alert(1)"/><image href="https://evil.test/pixel"/><a href="javascript:alert(1)"><path onload="alert(1)" d="M0 0L1 1"/></a><style>@import "https://evil.test/a.css";.x{fill:url(https://evil.test/x);stroke:red;background-image:image-set("https://evil.test/b")}</style><path fill="url(https://evil.test/y)" v-html="alert(1)" style="fill:url(https://evil.test/z);stroke:blue"/>', 'viewBox="0 0 24 24" onload="alert(1)"')}`;
  const result = run(source, { ...off });
  for (const svg of [
    result.original,
    result.optimized,
    result.exports.jsx,
    result.exports.vue,
  ]) {
    assert.doesNotMatch(
      svg,
      /evil\.test|alert\(1\)|<script|foreignObject|<animate|onload|v-html|@import/
    );
    assert.match(svg, /stroke:blue|stroke.*blue/);
  }
  assert.ok(result.warnings.length);
});
test("local fragment references and CSS survive; namespace references are valid", () => {
  const result = run(
    wrap(
      '<defs><path id="shape" d="M0 0L1 1"/></defs><use xlink:href="#shape"/><path clip-path="url(#clip)"/><style>.x{fill:red;stroke:blue}</style>'
    )
  );
  assert.match(result.optimized, /xlink:href="#shape"/);
  assert.match(result.optimized, /xmlns:xlink="http:\/\/www.w3.org\/1999\/xlink"/);
  assert.match(result.optimized, /clip-path="url\(#clip\)"/);
  assert.match(result.optimized, /\.x\{fill:red;stroke:blue\}/);
});
test("invalid XML, entities, limits and invalid component names have bounded errors", () => {
  for (const source of [
    "",
    "not svg",
    "<svg>",
    "<html/>",
    "<svg/><svg/>",
    '<!DOCTYPE svg [<!ENTITY x "abc">]><svg>&x;</svg>',
  ])
    assert.throws(() => run(source));
  assert.throws(() => run(`<svg>${" ".repeat(svgLimits.inputBytes)}</svg>`), /512 KB/);
  assert.throws(
    () => run(wrap("<g>".repeat(65) + "<path/>" + "</g>".repeat(65))),
    /64 nested/
  );
  assert.throws(() => run(wrap("<path/>".repeat(10001))), /10,000 elements/);
  assert.throws(
    () =>
      optimizeSvg({
        source: sampleSvg,
        options: defaultOptions,
        componentName: "Bad() {alert(1)}",
      }),
    /component name/
  );
});

test("component exports omit XML prologues, retain literal template text, and deduplicate styles", () => {
  const source = `<?xml version="1.0"?><!DOCTYPE svg>${wrap('<text>{{ window.alert(1) }} {literal}</text><path style="fill:red;fill:blue"/>')}`;
  const result = run(source, { instructions: false });
  assert.match(result.optimized, /<\?xml/);
  assert.doesNotMatch(result.exports.vue, /<\?xml|<!DOCTYPE/);
  assert.match(result.exports.vue, /v-pre/);
  assert.match(result.exports.jsx, /"fill": "blue"/);
  assert.doesNotMatch(result.exports.jsx, /"fill": "red"/);
  const compilation = ts.transpileModule(result.exports.tsx, {
    fileName: "icon.tsx",
    reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
  });
  assert.equal(
    compilation.diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error)
      .length,
    0
  );
});

test("generated TSX passes semantic React typing, including CSS custom properties", () => {
  const code = run(
    wrap('<path stroke-linecap="round" style="--icon-color:red;fill:var(--icon-color)"/>')
  ).exports.tsx;
  const file = `${process.cwd()}/.svg-export-typecheck.tsx`;
  const options: ts.CompilerOptions = {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2020,
  };
  const host = ts.createCompilerHost(options),
    get = host.getSourceFile;
  host.getSourceFile = (name, language, onError, create) =>
    name === file
      ? ts.createSourceFile(file, code, language, true)
      : get(name, language, onError, create);
  const program = ts.createProgram([file], options, host);
  assert.deepEqual(
    ts
      .getPreEmitDiagnostics(program)
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")),
    []
  );
});

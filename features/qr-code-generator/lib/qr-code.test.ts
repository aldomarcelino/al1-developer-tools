import test from "node:test";
import assert from "node:assert/strict";
import { wifiPayload } from "./qr-code.ts";

test("Wi-Fi QR escapes delimiters and omits password for open networks", () => {
  assert.equal(
    wifiPayload('Cafe;A:B,C"D\\E', "pa;ss", "WPA", true),
    'WIFI:T:WPA;S:Cafe\\;A\\:B\\,C\\"D\\\\E;P:pa\\;ss;H:true;;'
  );
  assert.equal(
    wifiPayload("Guest", "ignored", "nopass", false),
    "WIFI:T:nopass;S:Guest;H:false;;"
  );
});

export function wifiPayload(
  ssid: string,
  password: string,
  security: "WPA" | "WEP" | "nopass",
  hidden: boolean
): string {
  const escape = (value: string) => value.replace(/[\\;,:\"]/g, "\\$&");
  return `WIFI:T:${security};S:${escape(ssid)};${security === "nopass" ? "" : `P:${escape(password)};`}H:${hidden};;`;
}

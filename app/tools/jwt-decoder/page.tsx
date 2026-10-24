import { JwtWorkspace } from "@/components/jwt-workspace";

export const metadata = {
  title: "JWT Decoder — Inspect & Validate JSON Web Tokens",
  description:
    "Decode and inspect JSON Web Tokens (JWT) client-side. Check expiration timestamps, claims descriptions, headers, and signatures with 100% privacy.",
};

export default function Page() {
  return <JwtWorkspace />;
}

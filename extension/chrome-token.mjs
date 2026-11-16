// Once, for CI's Chrome Web Store uploads: asks for the OAuth client (Desktop app) id and secret, opens Google's
// consent page, catches the answer on a local port and writes CWS_CLIENT_ID, CWS_CLIENT_SECRET and
// CWS_REFRESH_TOKEN straight into the repo's GitHub secrets (gh). Nothing is printed or saved.
// Run it in your own terminal: `pnpm ext:chrome-token`
import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { stdin, stdout } from "node:process";

/** A line from the terminal, typed blind when `hidden` (the secret never shows) */
function ask(question, hidden = false) {
  return new Promise((done) => {
    stdout.write(question);
    let line = "";
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const take = (chunk) => {
      for (const c of chunk) {
        if (c === "\r" || c === "\n") {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.off("data", take);
          stdout.write("\n");
          return done(line.trim());
        }
        if (c === "\u0003") process.exit(1); // Ctrl+C
        if (c === "\u007f") line = line.slice(0, -1);
        else {
          line += c;
          if (!hidden) stdout.write(c);
        }
      }
    };
    stdin.on("data", take);
  });
}

const id = await ask("OAuth client ID: ");
const secret = await ask("OAuth client secret (hidden): ", true);
if (!id || !secret) throw new Error("Both are needed.");

// Google sends the browser back to this port with a one-time code
const server = createServer();
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const redirect = `http://127.0.0.1:${server.address().port}`;
const consent = new URL("https://accounts.google.com/o/oauth2/v2/auth");
consent.search = new URLSearchParams({
  client_id: id,
  redirect_uri: redirect,
  response_type: "code",
  scope: "https://www.googleapis.com/auth/chromewebstore",
  access_type: "offline",
  prompt: "consent",
}).toString();
console.log("Opening Google in your browser. Sign in with the Chrome Web Store account and allow it.");
spawn("open", [consent.toString()], { stdio: "ignore" });

const code = await new Promise((done, fail) => {
  server.on("request", (req, res) => {
    const u = new URL(req.url ?? "/", redirect);
    const c = u.searchParams.get("code");
    res.end(c ? "Done, back to the terminal." : `No code: ${u.searchParams.get("error") ?? "?"}`);
    server.close();
    if (c) done(c);
    else fail(new Error(u.searchParams.get("error") ?? "no code"));
  });
});

const res = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  body: new URLSearchParams({
    code,
    client_id: id,
    client_secret: secret,
    redirect_uri: redirect,
    grant_type: "authorization_code",
  }),
});
const token = await res.json();
if (!token.refresh_token) throw new Error(`Google gave no refresh token: ${token.error ?? res.status}`);

for (const [name, value] of [
  ["CWS_CLIENT_ID", id],
  ["CWS_CLIENT_SECRET", secret],
  ["CWS_REFRESH_TOKEN", token.refresh_token],
])
  execFileSync("gh", ["secret", "set", name], { input: value, stdio: ["pipe", "ignore", "inherit"] });
console.log("Saved CWS_CLIENT_ID, CWS_CLIENT_SECRET and CWS_REFRESH_TOKEN as GitHub secrets.");

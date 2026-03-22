export type GitRemoteValidation =
  | { ok: true }
  | { ok: false; reason: string };

export function validateGitRemoteUrl(raw: string): GitRemoteValidation {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "gitUrl is empty" };
  }
  if (trimmed.length > 2048) {
    return { ok: false, reason: "gitUrl is too long" };
  }
  if (trimmed.startsWith("git@")) {
    const sshPattern = /^git@[^:]+:[^/\s][^\s]*$/;
    if (!sshPattern.test(trimmed)) {
      return { ok: false, reason: "gitUrl is not a valid ssh remote (expected git@host:path)" };
    }
    return { ok: true };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: "gitUrl is not a valid URL or ssh remote" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, reason: "gitUrl must use http(s) or ssh (git@host:path)" };
  }
  if (parsed.username !== "" && parsed.password !== "") {
    return { ok: false, reason: "gitUrl must not embed credentials" };
  }
  return { ok: true };
}

export function normalizeRef(raw: string | undefined): string | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (trimmed.length > 256) {
    return undefined;
  }
  if (/[\x00-\x1f]/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

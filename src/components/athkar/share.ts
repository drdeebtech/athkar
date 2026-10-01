import { siteConfig } from "@/config/site";

const plain = (text: string) => text.replace(/\(\(|\)\)/g, "").trim();

export function formatForSharing(text: string, title: string): string {
  return `${plain(text)}\n\n— ${title} | ${siteConfig.name}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Uses the native share sheet when available, otherwise WhatsApp. */
export async function shareText(text: string, url: string): Promise<void> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ text, url });
      return;
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank", "noopener,noreferrer");
}

import { siteConfig } from "@/config/site";
import { shareableText } from "@/lib/athkar/text";

export function formatForSharing(text: string, title: string): string {
  return `${shareableText(text)}\n\n— ${title} | ${siteConfig.name}`;
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

/**
 * Uses the native share sheet when available, otherwise opens WhatsApp.
 * The WhatsApp window opens synchronously so it keeps the click's user gesture.
 */
export function shareText(text: string, url: string): void {
  if (typeof navigator.share === "function") {
    navigator.share({ text, url }).catch(() => {
      // Cancelled or unsupported payload: nothing else to do.
    });
    return;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank", "noopener,noreferrer");
}

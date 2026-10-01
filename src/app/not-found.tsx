import Link from "next/link";
import { BrandArt } from "@/components/athkar/brand-art";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-14 text-center">
      <div className="clay px-6 pt-4 pb-10 [--clay-r:2.25rem]">
        <BrandArt name="beads" className="mx-auto w-[min(80%,20rem)]" sizes="320px" />
        <p className="font-display text-6xl font-extrabold text-primary">٤٠٤</p>
        <h1 className="mt-3 text-2xl font-extrabold">الصفحة غير موجودة</h1>
        <p className="mt-2 text-muted-foreground">ربما تغيّر الرابط. ابحث عن الذكر من الصفحة الرئيسية.</p>
        <Link href="/" className="clay-sm clay-press glaze mt-7 inline-block px-6 py-3 font-display font-bold [--hue:165]">
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}

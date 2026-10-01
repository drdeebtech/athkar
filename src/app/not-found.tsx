import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl font-bold text-primary">٤٠٤</p>
      <h1 className="mt-4 text-2xl font-bold">الصفحة غير موجودة</h1>
      <p className="mt-2 text-muted-foreground">ربما تغيّر الرابط. يمكنك البحث عن الذكر من الصفحة الرئيسية.</p>
      <Link href="/" className="mt-6 inline-block rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary/90">
        العودة للرئيسية
      </Link>
    </div>
  );
}

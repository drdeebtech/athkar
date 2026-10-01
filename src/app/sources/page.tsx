import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "المصادر",
  description: "مصادر الأذكار المعروضة في الموقع وطريقة تنظيمها.",
  alternates: { canonical: "/sources" },
};

export default function SourcesPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 leading-loose">
      <h1 className="mb-6 text-3xl font-bold">المصادر</h1>
      <div className="space-y-5 rounded-2xl border bg-card p-6">
        <section>
          <h2 className="mb-2 text-xl font-bold">نصوص الأذكار</h2>
          <p>
            الأذكار والأدعية من القرآن الكريم والسنة النبوية، بالترتيب الوارد في كتاب{" "}
            <strong>«حصن المسلم من أذكار الكتاب والسنة»</strong> للشيخ سعيد بن علي بن وهف القحطاني رحمه الله.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-bold">قاعدة البيانات</h2>
          <p>
            جُمعت النصوص والمراجع وعدد التكرار من مشروع{" "}
            <a href="https://github.com/osamayy/azkar-db" className="font-medium text-primary underline underline-offset-4" rel="noopener noreferrer" target="_blank">
              azkar-db
            </a>{" "}
            المفتوح، جزى الله القائمين عليه خيرًا.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-bold">التصحيح والاقتراحات</h2>
          <p>
            إن وجدت خطأً في نص أو تشكيل أو مرجع، فأرسل لنا عبر{" "}
            <a href="https://github.com/drdeebtech/athkar/issues" className="font-medium text-primary underline underline-offset-4" rel="noopener noreferrer" target="_blank">
              صفحة الملاحظات
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  );
}

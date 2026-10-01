import type { Metadata } from "next";
import { BrandArt } from "@/components/athkar/brand-art";

export const metadata: Metadata = {
  title: "المصادر",
  description: "مصادر الأذكار المعروضة في الموقع وطريقة تنظيمها.",
  alternates: { canonical: "/sources" },
};

export default function SourcesPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 leading-loose">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-4xl font-extrabold">المصادر</h1>
        <BrandArt name="beads" className="w-40 sm:w-52" sizes="208px" />
      </div>
      <div className="clay space-y-6 p-7 [--clay-r:2rem]">
        <section>
          <h2 className="mb-2 text-xl font-extrabold">نصوص الأذكار</h2>
          <p>
            الأذكار والأدعية من القرآن الكريم والسنة النبوية، بالترتيب الوارد في كتاب{" "}
            <strong>«حصن المسلم من أذكار الكتاب والسنة»</strong> للشيخ سعيد بن علي بن وهف القحطاني رحمه الله.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-extrabold">قاعدة البيانات</h2>
          <p>
            جُمعت النصوص والمراجع وعدد التكرار من مشروع{" "}
            <a href="https://github.com/osamayy/azkar-db" className="font-medium text-primary underline underline-offset-4" rel="noopener noreferrer" target="_blank">
              azkar-db
            </a>{" "}
            المفتوح، جزى الله القائمين عليه خيرًا.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-extrabold">التصحيح والاقتراحات</h2>
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

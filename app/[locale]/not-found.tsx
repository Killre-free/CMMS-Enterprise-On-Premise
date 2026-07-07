// app/[locale]/not-found.tsx
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      <Link href="/" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
        {t("backToDashboard")}
      </Link>
    </div>
  );
}

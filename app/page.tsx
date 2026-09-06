import { Dashboard } from "@/components/Dashboard";
import { parseTab } from "@/lib/tabs";

type HomePageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const tab = typeof params.tab === "string" ? params.tab : Array.isArray(params.tab) ? params.tab[0] : undefined;
  return <Dashboard initialTab={parseTab(tab)} />;
}

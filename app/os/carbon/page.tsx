import { Topbar } from "@/components/os/Topbar";
import { CarbonSuite } from "@/components/carbon/CarbonSuite";

export const metadata = { title: "ESG & Carbon Report" };

export default function CarbonPage() {
  return (
    <>
      <Topbar title="ESG & Carbon Report" subtitle="Audit-ready Scope 1·2·3 · Powered by SpareX" />
      <main className="space-y-6 p-5 lg:p-8">
        <CarbonSuite />
      </main>
    </>
  );
}

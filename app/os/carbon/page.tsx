import { Topbar } from "@/components/os/Topbar";
import { CarbonSuite } from "@/components/carbon/CarbonSuite";

export const metadata = { title: "Sustainability Intelligence" };

export default function CarbonPage() {
  return (
    <>
      <Topbar title="Sustainability Intelligence™" subtitle="Audit-ready Scope 1·2·3 carbon & ESG · Powered by SpareX" />
      <main className="space-y-6 p-5 lg:p-8">
        <CarbonSuite />
      </main>
    </>
  );
}

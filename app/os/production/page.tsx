import { Topbar } from "@/components/os/Topbar";
import { OeeWorkflow } from "@/components/production/OeeWorkflow";

export const metadata = { title: "Production Intelligence" };

export default function ProductionPage() {
  return (
    <>
      <Topbar title="Production Intelligence™" subtitle="OEE, downtime & losses · real time, floor to boardroom · Powered by SpareX" />
      <main className="p-5 lg:p-8">
        <OeeWorkflow />
      </main>
    </>
  );
}

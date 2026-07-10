import { Topbar } from "@/components/os/Topbar";
import { MaintenanceIntelligence } from "@/components/maintenance/MaintenanceIntelligence";

export const metadata = { title: "Maintenance Intelligence" };

export default function MaintenancePage() {
  return (
    <>
      <Topbar title="Maintenance Intelligence™" subtitle="Prescriptive maintenance · parts-ready · Bangkok Plant 1" />
      <main className="p-5 lg:p-8">
        <MaintenanceIntelligence />
      </main>
    </>
  );
}

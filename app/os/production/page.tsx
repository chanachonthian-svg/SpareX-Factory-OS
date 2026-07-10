import { Topbar } from "@/components/os/Topbar";
import { UnderMaintenance } from "@/components/os/UnderMaintenance";

export const metadata = { title: "OEE Intelligence · Under Maintenance" };

export default function ProductionPage() {
  return (
    <>
      <Topbar title="OEE Intelligence™" subtitle="Overall production efficiency · Under Maintenance" />
      <main className="p-5 lg:p-8">
        <UnderMaintenance feature="OEE Intelligence" />
      </main>
    </>
  );
}

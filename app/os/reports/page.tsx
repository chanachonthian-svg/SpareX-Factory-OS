import { Topbar } from "@/components/os/Topbar";
import { ReportsWorkspace } from "@/components/reports/ReportsWorkspace";

export const metadata = { title: "Report Center" };

export default function ReportsPage() {
  return (
    <>
      <Topbar title="Report Center" subtitle="AI-generated, audit-ready reports · Bangkok Plant 1" />
      <main className="p-5 lg:p-8">
        <ReportsWorkspace />
      </main>
    </>
  );
}

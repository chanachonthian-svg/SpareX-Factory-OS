import { Topbar } from "@/components/os/Topbar";
import { WorkOrdersModule } from "@/components/workorders/WorkOrdersModule";

export const metadata = { title: "Work Order Center" };

export default function WorkOrdersPage() {
  return (
    <>
      <Topbar title="Work Order Center" subtitle="Approved findings to tracked jobs · Powered by SpareX" />
      <main className="p-5 lg:p-8">
        <WorkOrdersModule />
      </main>
    </>
  );
}

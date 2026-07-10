import { Topbar } from "@/components/os/Topbar";
import { WorkOrdersModule } from "@/components/workorders/WorkOrdersModule";

export const metadata = { title: "Work Orders" };

export default function WorkOrdersPage() {
  return (
    <>
      <Topbar title="Work Orders" subtitle="Approved findings → tracked jobs · Powered by SpareX" />
      <main className="p-5 lg:p-8">
        <WorkOrdersModule />
      </main>
    </>
  );
}

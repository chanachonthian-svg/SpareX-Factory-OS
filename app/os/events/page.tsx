import { Topbar } from "@/components/os/Topbar";
import { CoreCenter } from "@/components/core/CoreCenter";

export const metadata = { title: "Event Center" };

export default function EventsPage() {
  return (
    <>
      <Topbar title="Event Center" subtitle="Unified operational event stream · Bangkok Plant 1" />
      <main className="p-5 lg:p-8">
        <CoreCenter kind="events" />
      </main>
    </>
  );
}

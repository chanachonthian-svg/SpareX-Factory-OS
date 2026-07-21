import { Topbar } from "@/components/os/Topbar";
import { CoreCenter } from "@/components/core/CoreCenter";

export const metadata = { title: "Notification Center" };

export default function NotificationsPage() {
  return (
    <>
      <Topbar title="Notification Center" subtitle="Delivery status, channels, and escalation · Bangkok Plant 1" />
      <main className="p-5 lg:p-8">
        <CoreCenter kind="notifications" />
      </main>
    </>
  );
}

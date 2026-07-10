import { Topbar } from "@/components/os/Topbar";
import { AlarmCenter } from "@/components/alarms/AlarmCenter";

export const metadata = { title: "Alarm Center" };

export default function AlarmsPage() {
  return (
    <>
      <Topbar title="Alarm Center" subtitle="Cross-module alerts · AI-prioritized · Bangkok Plant 1" />
      <main className="p-5 lg:p-8">
        <AlarmCenter />
      </main>
    </>
  );
}

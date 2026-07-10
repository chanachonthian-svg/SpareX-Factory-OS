import { Topbar } from "@/components/os/Topbar";
import { SettingsModule } from "@/components/settings/SettingsModule";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <Topbar title="Settings" subtitle="Machine criticality & configuration · Powered by SpareX" />
      <main className="p-5 lg:p-8">
        <SettingsModule />
      </main>
    </>
  );
}

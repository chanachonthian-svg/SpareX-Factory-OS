import { Topbar } from "@/components/os/Topbar";
import { AssetWorkspace } from "@/components/asset/AssetWorkspace";

export const metadata = { title: "AssetIQ" };

export default function AssetsPage() {
  return (
    <>
      <Topbar title="AssetIQ™" subtitle="Asset performance management · predict failures days ahead · Powered by SpareX" />
      <AssetWorkspace />
    </>
  );
}

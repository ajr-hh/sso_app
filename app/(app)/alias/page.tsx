import { AliasView } from "@/components/alias-view";
import { getAppUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function AliasPage() {
  const user = await getAppUser();
  return (
    <AliasView
      lastCraving={user.lastCraving ?? "Apple Pie"}
      lastFlex={user.lastFlex}
      recent={user.aliases.map((alias) => ({
        id: alias.id,
        craving: alias.craving,
        level: alias.level,
        swapTitle: alias.swapTitle,
        swapSub: alias.swapSub,
      }))}
    />
  );
}

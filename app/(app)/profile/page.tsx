import { ProfileForm } from "@/components/profile-form";
import { getAppUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getAppUser();
  return (
    <ProfileForm
      name={user.name}
      age={user.age ?? ""}
      contactInfo={user.contactInfo ?? ""}
      whyMatters={user.whyMatters ?? ""}
      motivators={user.motivators.split(", ").filter(Boolean)}
      goals={user.goals.map((goal) => goal.label)}
      pastAttempts={user.pastAttempts.map((attempt) => attempt.label)}
      contacts={user.accountability.map((contact) => ({
        id: contact.id,
        name: contact.name,
        contactInfo: contact.contactInfo,
        initials: contact.initials,
      }))}
    />
  );
}

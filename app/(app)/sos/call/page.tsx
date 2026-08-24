import { CallStartButton } from "@/components/call-start-button";
import {
  Avatar,
  BackBar,
  Card,
  Eyebrow,
  Footnote,
  Screen,
  ScreenSub,
  ScreenTitle,
} from "@/components/ui";
import { getAppUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function CallPage() {
  const user = await getAppUser();

  return (
    <Screen>
      <BackBar label="Talk to Someone" href="/sos/rails" />
      <Eyebrow>Live support</Eyebrow>
      <ScreenTitle>Choose who to hear from</ScreenTitle>
      <ScreenSub>A real person, right now.</ScreenSub>

      <Card>
        <div className="flex items-center gap-3">
          <Avatar initials="MK" />
          <div className="flex-1">
            <p className="text-[14.5px] font-bold">Coach Maya K.</p>
            <p className="text-xs text-ink-70">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#3DBE6B]" />
              Available now — nutrition coach
            </p>
          </div>
          <CallStartButton href="/sos/call/active?name=Coach%20Maya%20K.&initials=MK" />
        </div>
      </Card>

      {user.accountability.map((contact) => (
        <Card key={contact.id}>
          <div className="flex items-center gap-3">
            <Avatar initials={contact.initials || contact.name.slice(0, 2).toUpperCase()} muted />
            <div className="flex-1">
              <p className="text-[14.5px] font-bold">{contact.name}</p>
              <p className="text-xs text-ink-70">
                {contact.contactInfo || `Your #${contact.priority + 1} accountability partner`}
              </p>
            </div>
            <CallStartButton
              href={`/sos/call/active?name=${encodeURIComponent(contact.name)}&initials=${encodeURIComponent(contact.initials || contact.name.slice(0, 2))}`}
              variant="ghost"
              icon="videocam"
            />
          </div>
        </Card>
      ))}

      <Footnote>
        If no one&rsquo;s available, SOS automatically offers another reinforcement type instead — no
        dead ends.
      </Footnote>
    </Screen>
  );
}

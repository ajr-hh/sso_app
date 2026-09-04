import { PhotoComposer } from "../../../components/PhotoComposer";
import { SosScreen, useSosPath } from "../../../components/SosUi";

export default function WhyScreen() {
  const path = useSosPath();

  return (
    <SosScreen
      eyebrow="REMEMBER YOUR WHY"
      subtitle="Return to the people, moments, and reasons that matter to you."
      title="Reconnect with your reason"
    >
      <PhotoComposer mode="remember_why" path={path} />
    </SosScreen>
  );
}

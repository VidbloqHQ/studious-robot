import {
  ParticipantContext,
  useLocalParticipant,
} from "@livekit/components-react";
import { ParticipantNotifications } from "./participant-notifications";

type StreamContainerProps = {
  children: React.ReactNode;
};

const StreamContainer = ({children}: StreamContainerProps) => {
    const p = useLocalParticipant();
  return (
    <ParticipantContext.Provider value={p.localParticipant}>
       <ParticipantNotifications />
        {children}
    </ParticipantContext.Provider>
  )
}

export default StreamContainer;
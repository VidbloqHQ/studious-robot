import {
  ParticipantContext,
  useLocalParticipant,
} from "@livekit/components-react";
import UserView from "./user-view";
import { ParticipantNotifications } from "./participant-notifications";

type StreamContainerProps = {
  children?: React.ReactNode;
};

const StreamContainer = ({children}: StreamContainerProps) => {
    const p = useLocalParticipant();
  return (
    <ParticipantContext.Provider value={p.localParticipant}>
       <ParticipantNotifications />
        {children ?? <UserView />}
    </ParticipantContext.Provider>
  )
}

export default StreamContainer;
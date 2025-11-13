import {
  ParticipantContext,
  useLocalParticipant,
} from "@livekit/components-react";

type StreamContainerProps = {
  children: React.ReactNode;
};

const StreamContainer = ({children}: StreamContainerProps) => {
    const p = useLocalParticipant();
  return (
    <ParticipantContext.Provider value={p.localParticipant}>
        {children}
    </ParticipantContext.Provider>
  )
}

export default StreamContainer;
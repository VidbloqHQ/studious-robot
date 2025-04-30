import { StreamProvider, VidbloqProgramProvider } from "../context";

type StreamRoomProps = {
  roomName: string;
  children: React.ReactNode;
};

const StreamRoom = ({ roomName, children }: StreamRoomProps) => {
  return (
    <StreamProvider roomName={roomName}>
      <VidbloqProgramProvider>{children}</VidbloqProgramProvider>
    </StreamProvider>
  );
};

export default StreamRoom;

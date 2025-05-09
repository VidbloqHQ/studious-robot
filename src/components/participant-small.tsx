import { Participant } from "../types";

type ParticipantSmallProps = {
  participant: Participant;
};

const ParticipantSmall = ({ participant }: ParticipantSmallProps) => {
  const { userName } = participant;
  return (
    <div>
      <img
        src={
          "https://res.cloudinary.com/adaeze/image/upload/v1745404837/vaq22f4hotztogwlnhzq.png"
        }
        className="h-[48px] w-[48px]"
      />
      <p className="text-sm">@{userName}</p>
    </div>
  );
};

export default ParticipantSmall;

import { useStreamContext, useParticipantList } from "../../hooks";
import { Modal } from "../base";
import { Icon } from "../icons";
import ParticipantSmall from "../participant-small";

type ParticipantListModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const ParticipantListModal = ({
  isOpen,
  onClose,
}: ParticipantListModalProps) => {
  const { userType } = useStreamContext();
  const { participants, count } = useParticipantList();

  if (!isOpen) return null;
  return (
    <div className="relative">
      <Modal
        onClose={onClose}
        position="right"
        childClassName="bg-[var(--sdk-bg-primary-color)] h-full rounded-l-xl lg:w-1/3 p-3 lg:p-5"
      >
        <div className="flex flex-col gap-y-3">
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-row items-center rounded-lg bg-[#DCCCF61F] gap-x-1 p-0.5">
              <button className="bg-primary text-text-primary p-2 rounded-lg">
                {count}
              </button>
              <p className="text-text-secondary opacity-80 lg:text-lg font-semibold">
                Viewers
              </p>
            </div>
            {userType === "host" && (
              <div className="rounded-2xl bg-[#F9F9F9] p-2 cursor-pointer">
                <Icon
                  name="download-cloud"
                  size={28}
                  className="text-primary "
                />
              </div>
            )}
          </div>
          <div className="rounded-lg bg-[#F9F9F9] flex flex-row items-center justify-between p-1 cursor-pointer">
            <input
              className="bg-transparent focus:outline-none w-full"
              placeholder="Search username..."
            />
            <div className="bg-primary p-2 rounded-lg">
              <Icon name="search" size={18} className="text-text-primary" />
            </div>
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-x-2 gap-y-3 max-h-[500px] lg:max-h-[520px] overflow-y-auto">
            {participants.map((participant, i) => (
              <ParticipantSmall participant={participant} key={i} />
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ParticipantListModal;

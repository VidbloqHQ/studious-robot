import { useNotification, useStreamContext } from "../../../hooks/index";
import { Modal } from "../../base";
import { Icon } from "../../icons";

type ShareModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const ShareModal = ({ onClose, isOpen }: ShareModalProps) => {
  const { addNotification } = useNotification();
  const { roomName } = useStreamContext();
  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addNotification({
        type: "success",
        message: "Link copied",
        duration: 3000,
      });
    } catch (error) {
      console.log(error);
      addNotification({
        type: "error",
        message: "Something went wrong",
        duration: 3000,
      });
    }
  };
  if (!isOpen) return null;
  return (
    <div className="relative">
      <Modal
        onClose={onClose}
        position="bottom"
        childClassName="bg-[var(--sdk-bg-primary-color)] h-[250px] w-[300px] ml-2 mb-16 rounded-xl"
        isClosable={false}
      >
        <div
          className="bg-[var(--sdk-bg-primary-color)] p-1.5 absolute -top-2.5 -right-1.5 rounded cursor-pointer"
          onClick={onClose}
        >
          <Icon name="close" size={8} className="text-text-secondary" />
        </div>
        <div className="p-2 flex flex-col gap-y-1">
          <div className="flex flex-row items-center gap-x-1">
            <p className="text-text-secondary opacity-40 text-sm">Welcome!</p>
            <span>🥳</span>
          </div>

          <p className="text-xl text-text-secondary opacity-80 font-semibold">
            Your stream is ready
          </p>
          <p className="text-text-secondary opacity-40 text-sm">
            Share meeting link with others you want here.
          </p>
          <div className="border border-primary flex flex-row items-center rounded-xl p-0.5 justify-between">
            <div className="flex flex-row items-center gap-x-1 flex-1 min-w-0">
              <div className="bg-[#DCCCF63D] p-1 rounded-l-xl flex-shrink-0">
                <Icon name="link" className="text-primary" size={18} />
              </div>
              <p className="text-sm truncate min-w-0 flex-1">
                {`${window.location.hostname}/${roomName}`}
              </p>
            </div>
            <div
              onClick={() =>
                copyText(`${window.location.hostname}/${roomName}`)
              }
              className="cursor-pointer p-1.5 rounded-lg bg-primary flex-shrink-0 ml-1"
            >
              <Icon name="copy" size={14} className="text-text-primary" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ShareModal;

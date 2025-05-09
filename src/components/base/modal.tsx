import { Icon } from "../icons";

type ModalProps = {
  children: React.ReactNode;
  onClose: () => void; // Simplified close function
  bgColor?: string; // Background color for the modal overlay
  position?: "left" | "right" | "center" | "bottom"; // Position of the modal content
  childClassName?: string; // ClassName for the child container (excluding position)
  isClosable?: boolean; // Whether the close button is visible
};

const Modal = ({
  children,
  onClose,
  bgColor = "bg-black bg-opacity-50", // Default modal overlay background
  position = "center", // Default position
  childClassName = "w-3/4 h-full bg-[var(--sdk-bg-primary-color)] p-6 overflow-y-auto overflow-x-hidden", // Default child styles
  isClosable = true, // Close button is visible by default
}: ModalProps) => {
  // Calculate position classes dynamically
  const positionClass =
    position === "right"
      ? "right-0 top-0"
      : position === "left"
      ? "left-0 top-0"
      : position === "bottom"
      ? "bottom-0 left-0 right-0"
      : "left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2";

  return (
    <div className={`z-[80] w-full h-full fixed top-0 ${bgColor} left-0`}>
      <div className={`absolute ${positionClass} ${childClassName}`}>
        {isClosable && (
          <div className="absolute top-5 right-5 text-text-secondary cursor-pointer" onClick={onClose}>
             <Icon name="close" size={{ desktop: 14, mobile: 12}}/>
          </div>
        )}
        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
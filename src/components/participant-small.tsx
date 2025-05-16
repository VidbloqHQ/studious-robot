import { useState } from "react";
import { Participant } from "../types";
import { Icon } from "./icons";

type ParticipantSmallProps = {
  participant: Participant;
  onSendClick?: (participant: Participant) => void;
};

const ParticipantSmall = ({ participant, onSendClick }: ParticipantSmallProps) => {
  const { userName } = participant;
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  
  const handleClick = () => {
    setShowDropdown(!showDropdown);
  };
  
  const handleSendClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSendClick) {
      onSendClick(participant);
      setShowDropdown(false);
    }
  };

  const handleClickOutside = () => {
    if (showDropdown) {
      setShowDropdown(false);
    }
  };
  
  return (
    <div className="relative">
      <div 
        className="flex flex-col items-center cursor-pointer" 
        onClick={handleClick}
      >
        <img
          src={
            "https://res.cloudinary.com/adaeze/image/upload/v1745404837/vaq22f4hotztogwlnhzq.png"
          }
          className="h-[48px] w-[48px]"
          alt={`${userName}'s avatar`}
        />
        <p className="text-sm">@{userName}</p>
      </div>
      
      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={handleClickOutside}
          ></div>
          <div className="absolute z-20 mt-1 w-24 bg-white shadow-lg rounded-lg py-1 right-0">
            <div 
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
              onClick={handleSendClick}
            >
              <Icon name="moneyTransfer" size={16} className="mr-2 text-primary" />
              <span>Send</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ParticipantSmall;
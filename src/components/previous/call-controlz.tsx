import { useState } from "react";
import { Track } from "livekit-client";
import {
  TrackToggle,
  // useLocalParticipant,
  // useRoomContext,
} from "@livekit/components-react";
import { Icon } from "../icons";

const CallControlz = () => {
  const [isCameraOn, setIsCameraOn] = useState<boolean>();
  const [isMicOn, setIsMicOn] = useState<boolean>();
  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        {/* Left group - Link and Menu icons */}
        <div className="bg-[#F2EFFE] rounded-full py-2 px-3 flex items-center space-x-2">
          <div className="bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
            <Icon name="circle" className="text-[#F5F5F5]" size={12} />
            <div className="bg-[#DCCCF63D] p-2 rounded-xl">
              <Icon name="link" className="text-primary" />
            </div>
          </div>
          <div className="bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
            <Icon name="circle" className="text-[#F5F5F5]" size={12} />
            <div className="bg-[#DCCCF63D] p-2 rounded-xl">
              <Icon name="more" className="text-primary" />
            </div>
          </div>
        </div>

        {/* Record button - standalone with corrected layout */}
        <div className="rounded-2xl p-0.5 bg-primary flex flex-row text-white items-center gap-x-2 cursor-pointer">
          <span className="ml-2">Record</span>
          <div className="rounded-2xl bg-[#8B55E2] p-2">
            <Icon name="record" className="text-white" />
          </div>
        </div>

        {/* Icon group - main middle section */}
        <div className="bg-[#F2EFFE] rounded-full py-2 px-3 flex items-center space-x-2">
          <div className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
            <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
              <Icon name="hand" className="text-primary" />
            </div>
          </div>

          <TrackToggle source={Track.Source.ScreenShare} showIcon={false}>
            <div className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
              <div className="bg-gradient-to-t from-[#DCCCF6] to-bg-primary rounded-2xl h-full flex flex-col items-center justify-center">
                <Icon name="screen" className="text-primary" />
              </div>
            </div>
          </TrackToggle>
          <TrackToggle
            source={Track.Source.Microphone}
            showIcon={false}
            onChange={(e) => setIsMicOn(e)}
          >
            <div className="bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
              <Icon name="circle" className="text-[#F5F5F5]" size={12} />
              {isMicOn ? (
                <div className="bg-primary p-2 rounded-xl">
                  <Icon name="audio" className="text-white" />
                </div>
              ) : (
                <div className="bg-[#F5F5F5] p-2 rounded-xl">
                  <Icon name="audioOff" className="text-white" />
                </div>
              )}
            </div>
          </TrackToggle>
          <TrackToggle
            source={Track.Source.Camera}
            showIcon={false}
            onChange={(e) => setIsCameraOn(e)}
          >
            <div className="bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
              <Icon name="circle" className="text-[#F5F5F5]" size={12} />
              {isCameraOn ? (
                <div className="bg-primary p-2 rounded-xl">
                  <Icon name="video" className="text-white" />
                </div>
              ) : (
                <div className="bg-[#F5F5F5] p-2 rounded-xl">
                  <Icon name="videoOff" className="text-white" />
                </div>
              )}
            </div>
          </TrackToggle>

          <div className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
            <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
              <Icon name="smiley" className="text-yellow-400" />
            </div>
          </div>

          <div className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
            <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
              <Icon name="chat" className="text-primary" />
            </div>
          </div>
        </div>

        {/* End call button - standalone with corrected layout */}

        <div className="rounded-2xl p-0.5 bg-[#D40000] flex flex-row text-white items-center gap-x-2 cursor-pointer">
          <span className="ml-2">End</span>
          <div className="rounded-2xl bg-[#FF5555] p-2">
            <Icon name="phone" className="text-white" />
          </div>
        </div>

        {/* Right group - all the way on the right */}
        <div className="bg-[#F2EFFE] rounded-full py-2 px-3 flex items-center space-x-2">
          <div className="bg-white flex flex-row items-center justify-between p-0.5 rounded-2xl gap-x-2">
            <span>0</span>
            <div className="bg-[#DCCCF63D] p-2 rounded-xl">
              <Icon name="users" className="text-primary" />
            </div>
          </div>
          <div className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
            <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
              <Icon name="caption" className="text-primary" />
            </div>
          </div>

          <div className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
            <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
              <Icon name="filter" className="text-primary" />
            </div>
          </div>
          <div className="bg-white p-0.5 rounded-2xl cursor-pointer h-[44px] w-[44px]">
            <div className="bg-[#DCCCF63D] rounded-2xl h-full flex flex-col items-center justify-center">
              <Icon name="keypad" className="text-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallControlz;

/* <TrackToggle source={Track.Source.Camera} showIcon={false} className="text-white w-10">
                <Icon name="hand" size={{ mobile: 10, desktop: 22 }} />
              </TrackToggle> */

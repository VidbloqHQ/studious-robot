export type IconPath = {
  viewBox: string;
  paths: string[];
  fill?: string[];
  strokes?: string[];
  opacity?: number[];
  type?: "stroke" | "fill" | "hybrid";
};

export type IconName =
  | "calendar"
  | "Poll"
  | "Transaction"
  | "Giveaway"
  | "Q&A"
  | "Custom"
  | "arrow"
  | "copy"
  | "live"
  | "menu"
  | "chat"
  | "smiley"
  | "hand"
  | "video"
  | "audio"
  | "download"
  | "close"
  | "usdt"
  | "users"
  | "caption"
  | "more"
  | "screen"
  | "filter"
  | "keypad"
  | "record"
  | "phone"
  | "circle"
  | "videoOff"
  | "audioOff"
  | "signal"
  | "edit"
  | "moneyTransfer"
  | "download-cloud"
  | "search"
  | "usdc"
  | "sol"
  | "send"
  | "cameraSwitch"
  | "loading"
  | "list"
  | "grid"
  | "userMinus"
  | "link";

export type IconPathsType = {
  [key in IconName]: IconPath;
};

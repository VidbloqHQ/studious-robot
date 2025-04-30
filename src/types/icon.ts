export type IconPath = {
  viewBox: string;
  paths: string[];
  fill?: string[]; 
  strokes?: string[];
  type?: 'stroke' | 'fill' | 'hybrid';
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
  | "link";

export type IconPathsType = {
  [key in IconName]: IconPath;
};

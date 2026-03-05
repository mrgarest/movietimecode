import { BlurPower, TimecodeAction } from "@/enums/timecode";
import { ChatbotCommand } from "./chatbot";

export type SettingsOBSClientNull = SettingsOBSClient | null;

export interface Settings {
  timeBuffer: number;
  blurPower: BlurPower;
  nudity: TimecodeAction;
  sexualContentWithoutNudity: TimecodeAction;
  violence: TimecodeAction;
  sensitiveExpressions: TimecodeAction;
  useDrugsAlcoholTobacco: TimecodeAction;
  prohibitedSymbols: TimecodeAction;
  obsClient: SettingsOBSClientNull;
  obsCensorScene: string | null;
  playerContentCensorshipCommand: TimecodeAction;
  chatbotEnabled: boolean;
  checkStreamLive: boolean;
  editTwitchContentClassification: boolean;
  chatbotCommands: ChatbotCommand[];
}

export interface SettingsOBSClient {
  type: string;
  host: string;
  port: number;
  auth: string;
}

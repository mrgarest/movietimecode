export enum OBSType {
  streamlabs = "streamlabs",
  obsstudio = "obsstudio",
}

export interface Scene {
  id: string;
  name: string;
}

export type OBSRequest =
  | { type: "obs:connect" }
  | { type: "obs:ping"; connectionId: string }
  | { type: "obs:disconnect"; connectionId: string }
  | { type: "obs:getScene"; connectionId: string }
  | { type: "obs:getActiveScene"; connectionId: string }
  | { type: "obs:setActiveScene"; connectionId: string; scene: Scene }
  | {
      type: "obs:findScene";
      connectionId: string;
      name: string;
      scenes?: Scene[];
    };

export type OBSResponse =
  | { type: "obs:connect"; connectionId: string; result: boolean }
  | { type: "obs:pong"; connectionId: string }
  | { type: "obs:disconnect"; connectionId: string }
  | { type: "obs:getScene"; connectionId: string; result: Scene[] }
  | { type: "obs:getActiveScene"; connectionId: string; result: Scene | null }
  | { type: "obs:setActiveScene"; connectionId: string; result: boolean }
  | { type: "obs:findScene"; connectionId: string; result: Scene | null }
  | { type: "obs:onError"; connectionId: string; error: string }
  | { type: "obs:onClose"; connectionId: string };

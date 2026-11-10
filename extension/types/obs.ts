export enum OBSType {
  streamlabs = "streamlabs",
  obsstudio = "obsstudio",
}

export interface Scene {
  id: string;
  name: string;
}

/**
 * A source placed in a scene (OBS Studio "scene item", Streamlabs "SceneItem").
 */
export interface SceneItem {
  id: number | string;
  name: string;
  enabled: boolean;
  /** Input kind (OBS Studio) or source type (Streamlabs), used for the icon. */
  kind?: string | null;
  /** Streamlabs source id, used to look up the source type. */
  sourceId?: string;
  /** Streamlabs resource id used to call methods on the item. */
  resourceId?: string;
}

/**
 * What happens to a source while censorship is active.
 * hide — the source is turned off (e.g. screen capture with the movie).
 * show — the source is turned on (e.g. a blur/placeholder overlay).
 */
export enum OBSSourceAction {
  hide = "hide",
  show = "show",
}

export interface OBSSourceRule {
  sceneName: string;
  sourceName: string;
  action: OBSSourceAction;
}

export type OBSRequest =
  | { type: "obs:connect" }
  | { type: "obs:disconnect"; connectionId: string }
  | { type: "obs:getScene"; connectionId: string }
  | { type: "obs:getActiveScene"; connectionId: string }
  | { type: "obs:getSceneItems"; connectionId: string; scene: Scene }
  | {
      type: "obs:setSceneItemEnabled";
      connectionId: string;
      scene: Scene;
      item: SceneItem;
      enabled: boolean;
    };

export type OBSResponse =
  | { type: "obs:connect"; connectionId: string; result: boolean }
  | { type: "obs:disconnect"; connectionId: string }
  | { type: "obs:getScene"; connectionId: string; result: Scene[] }
  | { type: "obs:getActiveScene"; connectionId: string; result: Scene | null }
  | { type: "obs:getSceneItems"; connectionId: string; result: SceneItem[] }
  | { type: "obs:setSceneItemEnabled"; connectionId: string; result: boolean }
  | { type: "obs:onError"; connectionId: string; error: string }
  | { type: "obs:onClose"; connectionId: string };

import sha256 from "crypto-js/sha256";
import Base64 from "crypto-js/enc-base64";
import config from "config";
import { OBSType, Scene, SceneItem } from "@/types/obs";

interface Options {
  type: string;
  host?: string | null;
  port: number;
  auth?: string | null;
}

type RequestKind =
  | "getScene"
  | "getActiveScene"
  | "getSceneItems"
  | "getSources"
  | "setSceneItemEnabled"
  | "ping";

interface RequestPayload {
  scene?: Scene;
  item?: SceneItem;
  enabled?: boolean;
}

interface PendingRequest {
  kind: RequestKind;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class OBSClient {
  private options: Options;
  private ws: WebSocket | null = null;
  private timeout: number = 5000;
  private requestTimeout: number = 3000;
  private keepAliveInterval: number = 20000;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private isConnected: boolean = false;
  private nextId: number = 1;
  private connectId: number = 0;
  private pending = new Map<number, PendingRequest>();

  private onErrorListener?: (msg: any) => void;
  private onCloseListener?: (msg: any) => void;

  private connectPromise?: {
    resolve: (value: boolean) => void;
    reject: (reason?: any) => void;
  };

  /**
   * Initializes an OBSClient instance with the given options.
   * @param options Settings for connecting to OBS (type, host, port, auth).
   */
  constructor(options: Options) {
    this.options = options;
  }

  /**
   * Connects to OBS via WebSocket.
   * @returns true if the connection is successful, or false in case of an error.
   */
  public connect(): Promise<boolean> {
    const host: string = this.options.host || "127.0.0.1";
    let path: string;
    switch (this.options.type) {
      case OBSType.streamlabs:
        path = "/api/303/jqgvbz3e/websocket";
        break;
      default:
        path = "";
        break;
    }

    return new Promise((resolve, reject) => {
      const connectTimer = setTimeout(() => {
        if (this.isConnected) return;
        this.isConnected = false;
        if (this.onErrorListener != null) this.onErrorListener("timeout");
        this.connectPromise?.resolve(false);
        this.disconnect();
      }, this.timeout);
      this.connectPromise = {
        resolve: (value: boolean) => {
          clearTimeout(connectTimer);
          if (value) this.startKeepAlive();
          resolve(value);
        },
        reject,
      };

      this.ws = new WebSocket(`ws://${host}:${this.options.port}${path}`);

      this.ws.onerror = (event: any) => {
        if (config.debug) {
          console.error(event);
        }
        this.isConnected = false;

        if (this.onErrorListener != null) this.onErrorListener(event);
        this.connectPromise?.resolve(false);
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.cleanup("WebSocket closed");
        this.connectPromise?.resolve(false);
        if (config.debug) console.log("[OBSClient] WebSocket Close");
        if (this.onCloseListener != null) this.onCloseListener(event);
      };
      
      this.message();
      this.ws!.onopen = () => {
        if (config.debug) console.log("[OBSClient] WebSocket Open");
        if (OBSType.streamlabs == this.options.type) {
          this.connectId = this.nextId++;
          this.send({
            id: this.connectId,
            jsonrpc: "2.0",
            method: "auth",
            params: {
              resource: "TcpServerService",
              args: [this.options.auth],
            },
          });
        }
      };
    });
  }

  /**
   * Disconnects from OBS by closing the WebSocket connection.
   */
  disconnect() {
    this.cleanup("Disconnected");
    if (this.ws) {
      this.isConnected = false;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Stops the keepalive and rejects all requests still waiting for a response.
   * @param reason Rejection reason for pending requests.
   */
  private cleanup(reason: string) {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    this.pending.forEach((request) => {
      clearTimeout(request.timer);
      request.reject(new Error(reason));
    });
    this.pending.clear();
  }

  /**
   * Periodically sends a cheap request so the connection (and the service worker that owns it) is not considered idle between censorship segments.
   */
  private startKeepAlive() {
    if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
    this.keepAliveTimer = setInterval(() => {
      if (!this.isConnected) return;
      this.request("ping").catch((error) => {
        if (config.debug) console.warn("[OBSClient] keepalive failed", error);
      });
    }, this.keepAliveInterval);
  }

  /**
   * Sends a request and waits for its response, matched by request id.
   * Rejects if OBS does not answer within `requestTimeout`.
   * @param kind Request kind.
   * @param payload Scene / scene item data for the request.
   */
  private request<T>(kind: RequestKind, payload: RequestPayload = {}): Promise<T> {
    if (!this.ws || !this.isConnected) {
      return Promise.reject(new Error("WebSocket is not connected"));
    }

    const requestId = this.nextId++;
    const promise = new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`OBS request "${kind}" timed out`));
      }, this.requestTimeout);
      this.pending.set(requestId, { kind, resolve, reject, timer });
    });

    const { scene, item, enabled } = payload;

    if (this.options.type === OBSType.streamlabs) {
      const calls: Record<RequestKind, { resource: string; method: string; args?: any[] }> = {
        getScene: { resource: "ScenesService", method: "getScenes" },
        getActiveScene: { resource: "ScenesService", method: "activeScene" },
        getSceneItems: { resource: `Scene${JSON.stringify([scene?.id])}`, method: "getItems" },
        getSources: { resource: "SourcesService", method: "getSources" },
        setSceneItemEnabled: {
          resource: item?.resourceId ?? "",
          method: "setVisibility",
          args: [enabled],
        },
        ping: { resource: "ScenesService", method: "activeScene" },
      };
      const { resource, method, args } = calls[kind];
      this.send({
        id: requestId,
        jsonrpc: "2.0",
        method,
        params: { resource, ...(args ? { args } : {}) },
      });
    } else {
      const requests: Record<RequestKind, { requestType: string; requestData?: any }> = {
        getScene: { requestType: "GetSceneList" },
        getActiveScene: { requestType: "GetCurrentProgramScene" },
        // Only used for Streamlabs; OBS Studio returns the input kind with the scene items
        getSources: { requestType: "GetInputList" },
        getSceneItems: {
          requestType: "GetSceneItemList",
          requestData: { sceneName: scene?.name },
        },
        setSceneItemEnabled: {
          requestType: "SetSceneItemEnabled",
          requestData: {
            sceneName: scene?.name,
            sceneItemId: Number(item?.id),
            sceneItemEnabled: enabled,
          },
        },
        ping: { requestType: "GetVersion" },
      };
      const { requestType, requestData } = requests[kind];
      this.send({
        op: 6,
        d: {
          requestId: String(requestId),
          requestType,
          ...(requestData ? { requestData } : {}),
        },
      });
    }

    return promise;
  }

  /**
   * Resolves a pending request with the parsed response.
   * @param requestId Request id from the response.
   * @param parse Converts the raw response to the result for the request kind.
   */
  private settle(requestId: number, parse: (kind: RequestKind) => any) {
    const request = this.pending.get(requestId);
    if (!request) return;
    clearTimeout(request.timer);
    this.pending.delete(requestId);
    try {
      request.resolve(parse(request.kind));
    } catch (error) {
      request.reject(error);
    }
  }

  /**
   * Sets the WebSocket message handle depending on the type of OBS (streamlabs or obsstudio).
   */
  protected message() {
    this.ws!.onmessage = (event: any) => {
      switch (this.options.type) {
        case OBSType.streamlabs:
          this.streamlabsMessage(event);
          break;
        case OBSType.obsstudio:
          this.obsstudioMessage(event);
          break;
        default:
          return;
      }
    };
  }

  /**
   * Processes messages from OBS Streamlabs.
   * @param event WebSocket event.
   */
  protected streamlabsMessage(event: any) {
    let data: any;
    try {
      data = JSON.parse(JSON.parse(event.data.slice(1)));
    } catch {
      return;
    }

    if (data.id === this.connectId && !this.isConnected) {
      if (data.result === true) {
        this.isConnected = true;
        this.connectPromise?.resolve(true);
        return;
      }
      this.disconnect();
      if (this.onErrorListener) {
        this.onErrorListener("Connection to OBS could not be established");
      }
      this.isConnected = false;
      this.connectPromise?.resolve(false);
      return;
    }

    this.settle(data.id, (kind) => {
      if (data.error) throw new Error(data.error.message ?? "OBS request failed");
      const result = data.result;
      switch (kind) {
        case "getScene":
          return Array.isArray(result)
            ? result.map((e: any) => ({ id: e.id, name: e.name }))
            : [];
        case "getActiveScene":
          return result ? { id: result.id, name: result.name } : null;
        case "getSceneItems":
          return Array.isArray(result)
            ? result
                .filter((e: any) => e.sceneNodeType !== "folder")
                .map((e: any): SceneItem => ({
                  id: e.sceneItemId,
                  name: e.name,
                  enabled: e.visible !== false,
                  kind: e.type ?? null,
                  sourceId: e.sourceId,
                  resourceId:
                    e.resourceId ??
                    `SceneItem${JSON.stringify([e.sceneId, e.sceneItemId, e.sourceId])}`,
                }))
                .reverse()
            : [];
        case "getSources":
          return Array.isArray(result)
            ? result.map((e: any) => ({ id: e.sourceId ?? e.id, type: e.type ?? null }))
            : [];
        case "setSceneItemEnabled":
          return true;
        default:
          return result;
      }
    });
  }

  /**
   * Processes messages from OBS Studio.
   * @param event WebSocket event.
   */
  protected obsstudioMessage(event: any) {
    let data: any;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    switch (data.op) {
      case 0: {
        if (!data.d.authentication) {
          if (this.onErrorListener) {
            this.onErrorListener("Connection to OBS could not be established");
          }
          this.isConnected = false;
          this.connectPromise?.resolve(false);
          return;
        }
        const hash = Base64.stringify(
          sha256(this.options.auth + data.d.authentication.salt)
        )!;

        this.send({
          op: 1,
          d: {
            rpcVersion: 1,
            authentication: Base64.stringify(
              sha256(hash + data.d.authentication.challenge)
            ),
          },
        });
        return;
      }
      case 2:
        this.isConnected = true;
        this.connectPromise?.resolve(true);
        return;
      case 7:
        this.settle(Number(data.d.requestId), (kind) => {
          const status = data.d.requestStatus;
          const response = data.d.responseData;
          if (kind === "setSceneItemEnabled") {
            return status?.result == true;
          }
          if (!status?.result) {
            throw new Error(status?.comment ?? "OBS request failed");
          }
          switch (kind) {
            case "getScene":
              return (response?.scenes ?? []).map((e: any) => ({
                id: e.sceneUuid,
                name: e.sceneName,
              }));
            case "getActiveScene":
              return response?.currentProgramSceneName != null
                ? {
                    id: response.currentProgramSceneUuid,
                    name: response.currentProgramSceneName,
                  }
                : null;
            case "getSceneItems":
              // OBS lists items bottom-to-top; reverse to match the Sources dock
              return (response?.sceneItems ?? [])
                .map((e: any): SceneItem => ({
                  id: e.sceneItemId,
                  name: e.sourceName,
                  enabled: e.sceneItemEnabled !== false,
                  kind: e.isGroup ? "group" : (e.inputKind ?? "scene"),
                }))
                .reverse();
            default:
              return response;
          }
        });
        return;
    }
  }

  /**
   * Gets a list of scenes from the OBS.
   * @returns Returns an array of scenes (Scene[]).
   */
  public getScene(): Promise<Scene[]> {
    return this.request<Scene[]>("getScene");
  }

  /**
   * Receives an active scene from OBS.
   * @returns Returns the currently active scene (Scene) or null.
   */
  public getActiveScene(): Promise<Scene | null> {
    return this.request<Scene | null>("getActiveScene");
  }

  /**
   * Gets the sources (scene items) of a scene, ordered top-to-bottom as in the OBS Sources dock.
   * @param scene The scene whose sources to list.
   */
  public async getSceneItems(scene: Scene): Promise<SceneItem[]> {
    const items = await this.request<SceneItem[]>("getSceneItems", { scene });
    if (this.options.type !== OBSType.streamlabs || items.every((item) => item.kind)) {
      return items;
    }

    // Streamlabs scene items do not carry the source type, it is on the source itself
    try {
      const sources = await this.request<{ id: string; type: string | null }[]>("getSources");
      const types = new Map(sources.map((source) => [source.id, source.type]));
      return items.map((item) => ({
        ...item,
        kind: item.kind ?? (item.sourceId ? types.get(item.sourceId) ?? null : null),
      }));
    } catch (error) {
      // The type only picks the icon, so the list is still usable without it
      if (config.debug) console.warn("[OBSClient] failed to get source types", error);
      return items;
    }
  }

  /**
   * Shows or hides a source in a scene.
   * @param scene The scene that contains the source.
   * @param item The source (scene item) to change.
   * @param enabled true to show the source, false to hide it.
   * @returns true if OBS applied the change.
   */
  public setSceneItemEnabled(scene: Scene, item: SceneItem, enabled: boolean): Promise<boolean> {
    return this.request<boolean>("setSceneItemEnabled", { scene, item, enabled });
  }

  /**
   * Sends data via WebSocket.
   * @param data Data to send.
   */
  protected send(data: any) {
    if (!this.ws) {
      if (this.onErrorListener)
        this.onErrorListener("WebSocket is not connected");
      if (config.debug) console.error("WebSocket is not connected");
      return;
    }
    try {
      if (this.options.type === OBSType.streamlabs) {
        data = JSON.stringify(data);
      }

      this.ws.send(JSON.stringify(data));
    } catch (error) {
      if (this.onErrorListener != null) this.onErrorListener(error);
      if (config.debug) console.error(error);
    }
  }

  /**
   * Sets the handle for the WebSocket close event.
   * @param onCloseListener Function called when the connection is closed.
   */
  public onClose(onCloseListener: (msg: any) => void) {
    this.onCloseListener = onCloseListener;
  }

  /**
   * Sets the handle for WebSocket errors.
   * @param onErrorListener Function called when an error occurs.
   */
  public onError(onErrorListener: (msg: any) => void) {
    this.onErrorListener = onErrorListener;
  }
}

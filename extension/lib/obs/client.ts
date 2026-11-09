import sha256 from "crypto-js/sha256";
import Base64 from "crypto-js/enc-base64";
import config from "config";
import { OBSType, Scene } from "@/types/obs";

interface Options {
  type: string;
  host?: string | null;
  port: number;
  auth?: string | null;
}

type RequestKind = "getScene" | "getActiveScene" | "setActiveScene" | "ping";

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
   * @param scene Scene for `setActiveScene`.
   */
  private request<T>(kind: RequestKind, scene?: Scene): Promise<T> {
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

    if (this.options.type === OBSType.streamlabs) {
      const methods: Record<RequestKind, { method: string; args?: any[] }> = {
        getScene: { method: "getScenes" },
        getActiveScene: { method: "activeScene" },
        setActiveScene: { method: "makeSceneActive", args: [scene?.id] },
        ping: { method: "activeScene" },
      };
      const { method, args } = methods[kind];
      this.send({
        id: requestId,
        jsonrpc: "2.0",
        method,
        params: { resource: "ScenesService", ...(args ? { args } : {}) },
      });
    } else {
      const requestTypes: Record<RequestKind, string> = {
        getScene: "GetSceneList",
        getActiveScene: "GetCurrentProgramScene",
        setActiveScene: "SetCurrentProgramScene",
        ping: "GetVersion",
      };
      this.send({
        op: 6,
        d: {
          requestId: String(requestId),
          requestType: requestTypes[kind],
          ...(kind === "setActiveScene"
            ? { requestData: { sceneName: scene?.name } }
            : {}),
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
        case "setActiveScene":
          return result == true;
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
          if (kind === "setActiveScene") return status?.result == true;
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
   * Finds the scene by its name.
   * @param name The name of the scene.
   * @param scenes Array of scenes (optionally, if not passed, `getScene' is called).
   * @returns Returns the found scene or null if the scene is not found.
   */
  public async findScene(
    name: string,
    scenes: Scene[] = []
  ): Promise<Scene | null> {
    if (scenes.length === 0) scenes = await this.getScene();
    return scenes.find((f: any) => f.name == name) || null;
  }

  /**
   * Receives an active scene from OBS.
   * @returns Returns the currently active scene (Scene) or null.
   */
  public getActiveScene(): Promise<Scene | null> {
    return this.request<Scene | null>("getActiveScene");
  }

  /**
   * Sets the active scene in OBS.
   * @param scene The scene you want to make active.
   * @returns Returns true if the scene is successfully installed, or false if it fails.
   */
  public setActiveScene(scene: Scene): Promise<boolean> {
    return this.request<boolean>("setActiveScene", scene);
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

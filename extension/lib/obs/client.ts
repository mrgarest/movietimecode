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

export class OBSClient {
  private options: Options;
  private ws: WebSocket | null = null;
  private timeout:number = 5000;
  private isConnected: boolean = false;
  private ids: { [key: string]: number } = {
    connect: 100,
    getScene: 200,
    getActiveScene: 300,
    setActiveScene: 400,
  };

  private onErrorListener?: (msg: any) => void;
  private onCloseListener?: (msg: any) => void;

  private connectPromise?: {
    resolve: (value: boolean) => void;
    reject: (reason?: any) => void;
  };

  private getScenePromise?: {
    resolve: (scenes: Scene[]) => void;
    reject: (reason?: any) => void;
  };

  private getActiveScenePromise?: {
    resolve: (scenes: Scene | null) => void;
    reject: (reason?: any) => void;
  };

  private setActiveScenePromise?: {
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
      this.connectPromise = { resolve, reject };

      setTimeout(() => {
        if (this.isConnected) return;
        this.isConnected = false;
        if (this.onErrorListener != null) this.onErrorListener("timeout");
        this.connectPromise?.resolve(false);
        this.disconnect();
      }, this.timeout);

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
        if (config.debug) console.log("[OBSClient] WebSocket Close");
        if (this.onCloseListener != null) this.onCloseListener(event);
      };
      
      this.message();
      this.ws!.onopen = () => {
        if (config.debug) console.log("[OBSClient] WebSocket Open");
        if (OBSType.streamlabs == this.options.type) {
          this.send({
            id: this.createId("connect"),
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
    if (this.ws) {
      this.isConnected = false;
      this.ws.close();
      this.ws = null;
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
    switch (data.id) {
      case this.ids.connect:
        if (data.result === true) {
          this.isConnected = true;
          this.connectPromise?.resolve(true);
          break;
        }
        this.disconnect();
        if (this.onErrorListener) {
          this.onErrorListener("Connection to OBS could not be established");
        }
        this.isConnected = false;
        this.connectPromise?.resolve(false);
        break;
      case this.ids.getScene:
        if (data.result !== null) {
          this.getScenePromise?.resolve(
            data.result.map((e: any) => ({
              id: e.id,
              name: e.name,
            }))
          );
          break;
        }
        this.getScenePromise?.resolve([]);
        break;
      case this.ids.getActiveScene:
        if (data.result !== null) {
          this.getActiveScenePromise?.resolve({
            id: data.result.id,
            name: data.result.name,
          });
          break;
        }
        this.getActiveScenePromise?.resolve(null);
        break;
      case this.ids.setActiveScene:
        this.setActiveScenePromise?.resolve(data.result == true);
        break;

      default:
        break;
    }
  }

  /**
   * Processes messages from OBS Studio.
   * @param event WebSocket event.
   */
  protected obsstudioMessage(event: any) {
    const data = JSON.parse(event.data);

    switch (data.op) {
      case 0:
        if (!data.d.authentication) {
          if (this.onErrorListener) {
            this.onErrorListener("Connection to OBS could not be established");
          }
          this.isConnected = false;
          this.connectPromise?.resolve(false);
          break;
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
        break;
      case 2:
        this.isConnected = true;
        this.connectPromise?.resolve(true);
        break;
    }

    switch (data.d.requestId) {
      case this.ids.getScene:
        if (data.result !== null) {
          this.getScenePromise?.resolve(
            data.d.responseData.scenes.map((e: any) => ({
              id: e.sceneUuid,
              name: e.sceneName,
            }))
          );
          break;
        }
        this.getScenePromise?.resolve([]);
        break;
      case this.ids.getActiveScene:
        if (data.d.responseData?.currentProgramSceneName !== null) {
          this.getActiveScenePromise?.resolve({
            id: data.d.responseData.currentProgramSceneUuid,
            name: data.d.responseData.currentProgramSceneName,
          });
          break;
        }
        this.getActiveScenePromise?.resolve(null);
        break;
      case this.ids.setActiveScene:
        this.setActiveScenePromise?.resolve(
          data.d.requestStatus.result == true
        );
        break;
      default:
        break;
    }
  }

  /**
   * Gets a list of scenes from the OBS.
   * @returns Returns an array of scenes (Scene[]).
   */
  public getScene(): Promise<Scene[]> {
    return new Promise((resolve, reject) => {
      this.getScenePromise = { resolve, reject };
      const requestId = this.createId("getScene");
      switch (this.options.type) {
        case OBSType.streamlabs:
          this.send({
            id: requestId,
            jsonrpc: "2.0",
            method: "getScenes",
            params: { resource: "ScenesService" },
          });
          break;
        case OBSType.obsstudio:
          this.send({
            op: 6,
            d: {
              requestId: requestId,
              requestType: "GetSceneList",
            },
          });
          break;

        default:
          reject([]);
          break;
      }
    });
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
    return new Promise((resolve, reject) => {
      this.getActiveScenePromise = { resolve, reject };
      const requestId = this.createId("getActiveScene");
      switch (this.options.type) {
        case OBSType.streamlabs:
          this.send({
            id: requestId,
            jsonrpc: "2.0",
            method: "activeScene",
            params: { resource: "ScenesService" },
          });
          break;
        case OBSType.obsstudio:
          this.send({
            op: 6,
            d: {
              requestId: requestId,
              requestType: "GetCurrentProgramScene",
            },
          });
          break;

        default:
          reject([]);
          break;
      }
    });
  }

  /**
   * Sets the active scene in OBS.
   * @param scene The scene you want to make active.
   * @returns Returns true if the scene is successfully installed, or false if it fails.
   */
  public setActiveScene(scene: Scene): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.setActiveScenePromise = { resolve, reject };
      const requestId = this.createId("setActiveScene");
      switch (this.options.type) {
        case OBSType.streamlabs:
          this.send({
            id: requestId,
            jsonrpc: "2.0",
            method: "makeSceneActive",
            params: { resource: "ScenesService", args: [scene.id] },
          });
          break;
        case OBSType.obsstudio:
          this.send({
            op: 6,
            d: {
              requestId: requestId,
              requestType: "SetCurrentProgramScene",
              requestData: {
                sceneName: scene.name,
              },
            },
          });
          break;

        default:
          reject([]);
          break;
      }
    });
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

  /**
   * Generates a unique identifier for OBS requests.
   * @param id Base identifier.
   * @returns Generated numeric identifier.
   */
  protected createId(id: string): number {
    const randomPart = Math.floor(Math.random() * 1000);
    this.ids[id] = (this.ids[id] || 0) + randomPart;
    return this.ids[id];
  }
}

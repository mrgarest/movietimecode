import { OBSResponse, Scene } from "@/types/obs";

type ErrorListener = (msg: any) => void;
type CloseListener = (msg: any) => void;

export class OBSBackground {
  private connectionId?: string;
  private heartbeatInterval?: number;
  private onErrorListener?: ErrorListener;
  private onCloseListener?: CloseListener;

  constructor() {
    chrome.runtime.onMessage.addListener((message: OBSResponse) => {
      if (
        message.type === "obs:onError" &&
        message.connectionId === this.connectionId &&
        this.onErrorListener
      ) {
        this.onErrorListener(message.error);
      }
      if (
        message.type === "obs:onClose" &&
        message.connectionId === this.connectionId &&
        this.onCloseListener
      ) {
        this.onCloseListener(null);
      }
    });
  }

  async connect(): Promise<boolean> {
    const response = await this.send({ type: "obs:connect" });
    this.connectionId = response.connectionId;

    this.heartbeatInterval = window.setInterval(() => {
      if (this.connectionId) {
        this.send({ type: "obs:ping", connectionId: this.connectionId }).catch(
          () => {
            this.cleanup();
          },
        );
      }
    }, 120000);

    return response.result;
  }

  private cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    this.connectionId = undefined;
  }

  async disconnect(): Promise<void> {
    this.cleanup();
    if (!this.connectionId) return Promise.resolve();
    await this.send({
      type: "obs:disconnect",
      connectionId: this.connectionId,
    });
    this.connectionId = undefined;
  }

  async getScene(): Promise<Scene[]> {
    if (!this.connectionId) throw new Error("Not connected");
    return this.send({
      type: "obs:getScene",
      connectionId: this.connectionId,
    }).then((r) => r.result);
  }

  async getActiveScene(): Promise<Scene | null> {
    if (!this.connectionId) throw new Error("Not connected");
    return this.send({
      type: "obs:getActiveScene",
      connectionId: this.connectionId,
    }).then((r) => r.result);
  }

  async setActiveScene(scene: Scene): Promise<boolean> {
    if (!this.connectionId) throw new Error("Not connected");
    return this.send({
      type: "obs:setActiveScene",
      connectionId: this.connectionId,
      scene,
    }).then((r) => r.result);
  }

  async findScene(name: string, scenes?: Scene[]): Promise<Scene | null> {
    if (!this.connectionId) throw new Error("Not connected");
    return this.send({
      type: "obs:findScene",
      connectionId: this.connectionId,
      name,
      scenes,
    }).then((r) => r.result);
  }

  onError(listener: ErrorListener) {
    this.onErrorListener = listener;
  }

  onClose(listener: CloseListener) {
    this.onCloseListener = listener;
  }

  private send(message: any): Promise<any> {
    return chrome.runtime.sendMessage(message);
  }
}

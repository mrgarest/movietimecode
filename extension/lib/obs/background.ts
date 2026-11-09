import { OBSResponse, Scene } from "@/types/obs";

type ErrorListener = (msg: any) => void;
type CloseListener = (msg: any) => void;

/**
 * Content-script proxy to the OBSClient living in the background service worker.
 * Every request rejects on failure (including "connection lost" after the ervice worker was restarted), so callers can reconnect.
 */
export class OBSBackground {
  private connectionId?: string;
  private onErrorListener?: ErrorListener;
  private onCloseListener?: CloseListener;

  private readonly handleRuntimeMessage = (message: OBSResponse) => {
    if (!this.connectionId || message.connectionId !== this.connectionId) {
      return;
    }
    if (message.type === "obs:onError") {
      this.onErrorListener?.(message.error);
    }
    if (message.type === "obs:onClose") {
      this.onCloseListener?.(null);
    }
  };

  constructor() {
    chrome.runtime.onMessage.addListener(this.handleRuntimeMessage);
  }

  async connect(): Promise<boolean> {
    const response = await this.send({ type: "obs:connect" });
    this.connectionId = response.connectionId;
    return response.result;
  }

  async disconnect(): Promise<void> {
    chrome.runtime.onMessage.removeListener(this.handleRuntimeMessage);
    const connectionId = this.connectionId;
    this.connectionId = undefined;
    if (!connectionId) return;
    await this.send({ type: "obs:disconnect", connectionId }).catch(() => {});
  }

  async getScene(): Promise<Scene[]> {
    return this.request({ type: "obs:getScene" });
  }

  async getActiveScene(): Promise<Scene | null> {
    return this.request({ type: "obs:getActiveScene" });
  }

  async setActiveScene(scene: Scene): Promise<boolean> {
    return this.request({ type: "obs:setActiveScene", scene });
  }

  async findScene(name: string, scenes?: Scene[]): Promise<Scene | null> {
    return this.request({ type: "obs:findScene", name, scenes });
  }

  onError(listener: ErrorListener) {
    this.onErrorListener = listener;
  }

  onClose(listener: CloseListener) {
    this.onCloseListener = listener;
  }

  private async request(message: Record<string, any>): Promise<any> {
    if (!this.connectionId) throw new Error("Not connected");
    const response = await this.send({
      ...message,
      connectionId: this.connectionId,
    });
    return response.result;
  }

  private async send(message: any): Promise<any> {
    const response = await chrome.runtime.sendMessage(message);
    if (!response) throw new Error("No response from background");
    if (response.type === "obs:error") throw new Error(response.error);
    return response;
  }
}

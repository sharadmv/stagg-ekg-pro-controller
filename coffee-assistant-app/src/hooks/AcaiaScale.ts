// Constants matching pyacaia_async
export const SERVICE_UUID = '49535343-fe7d-4ae5-8fa9-9fafd205e455';
export const NOTIFY_CHAR_UUID = '49535343-1e4d-4bd9-ba61-23c647249616';
export const WRITE_CHAR_UUID = '49535343-8841-43f4-a8d4-ecbe34729bb3';

const HEADER1 = 0xEF;
const HEADER2 = 0xDD;

export interface AcaiaSample {
  t: number;
  w: number;
}

export type AcaiaState = {
  weight: number;
  timer: number;
  battery: number | null;
  isConnected: boolean;
  isRecording: boolean;
  samples: AcaiaSample[];
};

export type AcaiaCallback = (state: AcaiaState) => void;

export class AcaiaScale {
  private device: BluetoothDevice | null = null;
  private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private heartbeatInterval: number | null = null;
  
  private _state: AcaiaState = {
    weight: 0,
    timer: 0,
    battery: null,
    isConnected: false,
    isRecording: false,
    samples: []
  };

  private callbacks: Set<AcaiaCallback> = new Set();

  constructor() {}

  // --- Public API ---

  public get state(): AcaiaState {
    return { ...this._state, samples: [...this._state.samples] };
  }

  public subscribe(cb: AcaiaCallback) {
    this.callbacks.add(cb);
    cb(this.state);
    return () => this.callbacks.delete(cb);
  }

  private emit() {
    const s = this.state;
    this.callbacks.forEach(cb => cb(s));
  }

  public async connect() {
    try {
      if (!navigator.bluetooth) throw new Error("Bluetooth not supported");

      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'ACAIA' }, { namePrefix: 'PEARL' }, { namePrefix: 'LUNAR' }],
        optionalServices: [SERVICE_UUID]
      });

      this.device.addEventListener('gattserverdisconnected', () => this.onDisconnect());

      const server = await this.device.gatt?.connect();
      const service = await server?.getPrimaryService(SERVICE_UUID);
      const notifyChar = await service?.getCharacteristic(NOTIFY_CHAR_UUID);
      this.writeChar = (await service?.getCharacteristic(WRITE_CHAR_UUID)) || null;

      if (notifyChar && this.writeChar) {
        await notifyChar.startNotifications();
        notifyChar.addEventListener('characteristicvaluechanged', (e: Event) => this.handleNotification(e));

        // Initial Handshake (encode_id in python)
        await this.write(11, [0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x30, 0x31, 0x32, 0x33, 0x34]);
        await new Promise(r => setTimeout(r, 200));
        
        // Broad Notification Request: ask for weight, battery, timer, and key events
        console.log("⚖️ Acaia: Sending broad notification request");
        await this.write(12, [0x06, 0x00, 0x01, 0x01, 0x02, 0x02, 0x03]); 
        await new Promise(r => setTimeout(r, 200));

        this._state.isConnected = true;
        this.emit();

        this.heartbeatInterval = window.setInterval(() => this.sendHeartbeat(), 1000);
        console.log("⚖️ Acaia: Connected via AcaiaScale port");
      }
    } catch (e) {
      console.error("⚖️ Acaia: Connection failed", e);
      throw e;
    }
  }

  public disconnect() {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
  }

  public async tare() {
    console.log("⚖️ Acaia: Tare");
    await this.write(4, [0]);
  }

  public async startStopTimer() {
    // pyacaia_async: startTimer is 13, [0, 0], stopTimer is 13, [0, 2]
    if (!this._state.isRecording) {
      console.log("⚖️ Acaia: Start Timer");
      await this.write(13, [0, 0]);
    } else {
      console.log("⚖️ Acaia: Stop Timer");
      await this.write(13, [0, 2]);
    }
  }

  public async resetTimer() {
    console.log("⚖️ Acaia: Reset Timer");
    await this.write(13, [0, 1]);
    this._state.isRecording = false;
    this._state.timer = 0;
    this.emit();
  }

  public clearSamples() {
    this._state.samples = [];
    this.emit();
  }

  // --- Internal Logic ---

  public async write(type: number, payload: number[]) {
    if (!this.writeChar) return;
    const msg = this.encode(type, payload);
    await this.writeChar.writeValueWithResponse(msg as BufferSource);
  }

  private encode(msgType: number, payload: number[]): Uint8Array {
    const byteMsg = new Uint8Array(5 + payload.length);
    byteMsg[0] = HEADER1;
    byteMsg[1] = HEADER2;
    byteMsg[2] = msgType;
    let cksum1 = 0;
    let cksum2 = 0;
    for (let i = 0; i < payload.length; i++) {
      const val = payload[i] & 0xFF;
      byteMsg[3 + i] = val;
      if (i % 2 === 0) cksum1 += val;
      else cksum2 += val;
    }
    byteMsg[3 + payload.length] = cksum1 & 0xFF;
    byteMsg[4 + payload.length] = cksum2 & 0xFF;
    return byteMsg;
  }

  private handleNotification(event: Event) {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value || value.byteLength < 3) return;

    const hex = Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))
      .map(b => b.toString(16).padStart(2, '0')).join(' ');
    
    const cmd = value.getUint8(2);
    
    if (cmd === 12 && value.byteLength >= 5) {
      const msgType = value.getUint8(4);
      console.debug(`⚖️ Acaia: CMD 12, Type ${msgType} [${hex}]`);
      this.processMessage(msgType, value, 5);
    } else if (cmd === 8 && value.byteLength >= 4) {
      this._state.battery = value.getUint8(4) & 0x7F;
      console.debug(`⚖️ Acaia: Settings/Battery ${this._state.battery}% [${hex}]`);
      this.emit();
    } else {
      console.debug(`⚖️ Acaia: Unknown CMD ${cmd} [${hex}]`);
    }
  }

  private processMessage(msgType: number, data: DataView, offset: number) {
    let updated = false;

    if (msgType === 5) { // Weight
      this._state.weight = this.decodeWeight(data, offset);
      updated = true;
    } else if (msgType === 7) { // Timer
      const newTime = this.decodeTime(data, offset);
      console.log(`⚖️ Acaia Timer Update: ${newTime}s`);
      this._state.timer = newTime;
      updated = true;
      if (newTime > 0) this._state.isRecording = true;
    } else if (msgType === 8) { // Event
      if (data.byteLength < offset + 2) return;
      const action = data.getUint8(offset);
      const type = data.getUint8(offset + 1);
      console.log(`⚖️ Acaia Event: Action=${action}, Type=${type}`);

      if (action === 0 && type === 5) { // Tare
        this._state.weight = this.decodeWeight(data, offset + 2);
        updated = true;
      } else if (action === 8 && type === 5) { // Start
        console.log("⚖️ Acaia: Physical START button pressed");
        this._state.weight = this.decodeWeight(data, offset + 2);
        this._state.isRecording = true;
        updated = true;
      } else if (action === 10 && type === 7) { // Stop
        this._state.timer = this.decodeTime(data, offset + 2);
        this._state.weight = this.decodeWeight(data, offset + 6);
        this._state.isRecording = false;
        console.log(`⚖️ Acaia: Physical STOP button pressed. Time: ${this._state.timer}s`);
        updated = true;
      } else if (action === 9 && type === 7) { // Reset
        this._state.timer = this.decodeTime(data, offset + 2);
        this._state.weight = this.decodeWeight(data, offset + 6);
        this._state.isRecording = false;
        console.log("⚖️ Acaia: Physical RESET button pressed");
        updated = true;
      }
    } else if (msgType === 11 && data.byteLength >= offset + 4) { // Heartbeat response
      const hbType = data.getUint8(offset + 2);
      if (hbType === 5) {
        this._state.weight = this.decodeWeight(data, offset + 3);
        updated = true;
      } else if (hbType === 7) {
        const hbTime = this.decodeTime(data, offset + 3);
        if (hbTime !== this._state.timer) {
          console.debug(`⚖️ Acaia Heartbeat Timer: ${hbTime}s`);
          this._state.timer = hbTime;
          updated = true;
        }
        if (this._state.timer > 0 && !this._state.isRecording) {
          this._state.isRecording = true;
        }
      }
    }

    if (updated) {
      // Only record samples if the timer has actually started
      if (this._state.isRecording && this._state.timer > 0) {
        this.addSample(this._state.timer, this._state.weight);
      }
      this.emit();
    }
  }

  private addSample(t: number, w: number) {
    const last = this._state.samples[this._state.samples.length - 1];
    if (!last || last.t !== t || last.w !== w) {
      this._state.samples.push({ t, w });
    }
  }

  private decodeWeight(p: DataView, offset: number): number {
    if (p.byteLength < offset + 6) return this._state.weight;
    const value = (p.getUint8(offset + 1) << 8) + p.getUint8(offset);
    const unit = p.getUint8(offset + 4);
    let div = 1;
    if (unit === 1) div = 10;
    else if (unit === 2) div = 100;
    else if (unit === 3) div = 1000;
    else if (unit === 4) div = 10000;
    
    let weight = value / div;
    if ((p.getUint8(offset + 5) & 0x02) === 0x02) weight *= -1;
    return weight;
  }

  private decodeTime(p: DataView, offset: number): number {
    if (p.byteLength < offset + 3) return this._state.timer;
    const m = p.getUint8(offset);
    const s = p.getUint8(offset + 1);
    const t = p.getUint8(offset + 2);
    const total = m * 60 + s + t / 10;
    
    // Log every timer decode for now to see what's happening
    console.log(`⚖️ Acaia Timer Bytes: [${m}, ${s}, ${t}] -> ${total}s`);
    
    return total;
  }

  private async sendHeartbeat() {
    try {
      await this.write(11, [0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x30, 0x31, 0x32, 0x33, 0x34]);
      await this.write(0, [2, 0]);
      await this.write(6, new Array(16).fill(0));
    } catch (e) {
      console.warn("⚖️ Acaia: Heartbeat failed", e);
    }
  }

  private onDisconnect() {
    this._state.isConnected = false;
    this._state.isRecording = false;
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
    this.emit();
    console.log("⚖️ Acaia: Disconnected");
  }
}

// Global instance
export const scaleInstance = new AcaiaScale();

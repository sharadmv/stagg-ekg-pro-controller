export interface AcaiaEventMap {
    'status': CustomEvent<string>;
    'weight': CustomEvent<number>;
    'timer': CustomEvent<{ min: number; sec: number; dec: number }>;
    'connected': Event;
    'disconnected': Event;
}

export class AcaiaScale extends EventTarget {
    private device: BluetoothDevice | null = null;
    private server: BluetoothRemoteGATTServer | null = null;
    private service: BluetoothRemoteGATTService | null = null;
    private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
    private heartbeatInterval: any = null;

    private readonly SERVICE_UUID = "49535343-fe7d-4ae5-8fa9-9fafd205e455";
    private readonly CHAR_WRITE = "49535343-8841-43f4-a8d4-ecbe34729bb3";
    private readonly CHAR_NOTIFY = "49535343-1e4d-4bd9-ba61-23c647249616";
    private readonly HEADER1 = 0xEF;
    private readonly HEADER2 = 0xDD;

    constructor() {
        super();
        this.handleNotification = this.handleNotification.bind(this);
        this.onDisconnected = this.onDisconnected.bind(this);
    }

    public get isConnected(): boolean {
        return this.device?.gatt?.connected ?? false;
    }

    public async connect() {
        try {
            this.emitStatus("Scanning...");
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: "ACAIA" }, { namePrefix: "PEARL" }, { namePrefix: "LUNAR" }],
                optionalServices: [this.SERVICE_UUID]
            });

            this.device.addEventListener('gattserverdisconnected', this.onDisconnected);

            this.emitStatus("Connecting GATT...");
            this.server = await this.device.gatt!.connect();

            this.emitStatus("Getting Service...");
            this.service = await this.server.getPrimaryService(this.SERVICE_UUID);

            this.emitStatus("Getting Characteristics...");
            this.writeChar = await this.service.getCharacteristic(this.CHAR_WRITE);
            const notifyChar = await this.service.getCharacteristic(this.CHAR_NOTIFY);

            this.emitStatus("Subscribing...");
            await notifyChar.startNotifications();
            notifyChar.addEventListener('characteristicvaluechanged', this.handleNotification);

            this.emitStatus("Handshake...");
            await this.sendHandshake();

            this.startHeartbeat();

            this.emitStatus("Connected");
            this.dispatchEvent(new Event('connected'));

        } catch (error: any) {
            console.error(error);
            this.emitStatus(`Error: ${error.message}`);
            throw error;
        }
    }

    public async disconnect() {
        if (this.device && this.device.gatt?.connected) {
            this.device.gatt.disconnect();
        }
    }

    public async tare() {
        await this.sendCommand(4, [0]);
    }

    public async startTimer() {
        await this.sendCommand(13, [0, 0]);
    }

    public async stopTimer() {
        await this.sendCommand(13, [0, 2]);
    }

    public async resetTimer() {
        await this.sendCommand(13, [0, 1]);
    }

    private async sendCommand(msgType: number, payload: number[]) {
        if (!this.writeChar) return;
        const cmd = this.encodeCommand(msgType, payload);
        await this.writeChar.writeValueWithoutResponse(cmd);
    }

    private encodeCommand(msgType: number, payload: number[]) {
        const data = [this.HEADER1, this.HEADER2, msgType, ...payload];
        let cksum1 = 0;
        let cksum2 = 0;

        for (let i = 0; i < payload.length; i++) {
            const val = payload[i] & 0xFF;
            if (i % 2 === 0) cksum1 += val;
            else cksum2 += val;
        }

        data.push(cksum1 & 0xFF);
        data.push(cksum2 & 0xFF);

        return new Uint8Array(data);
    }

    private async sendHandshake() {
        // 1. ID
        const idPayload = new Array(15).fill(0x2D);
        await this.sendCommand(11, idPayload);
        await new Promise(r => setTimeout(r, 500));

        // 2. Notification Request
        const reqPayload = [9, 0, 1, 1, 2, 2, 5, 3, 4];
        await this.sendCommand(12, reqPayload);
    }

    private startHeartbeat() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(async () => {
            if (this.isConnected && this.writeChar) {
                try {
                    await this.sendCommand(0, [2, 0]);
                } catch (e) {
                    console.warn("Heartbeat failed", e);
                }
            }
        }, 2500);
    }

    private onDisconnected() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.emitStatus("Disconnected");
        this.dispatchEvent(new Event('disconnected'));
    }

    private handleNotification(event: Event) {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const value = target.value;
        if (!value) return;

        const data = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

        for (let i = 0; i < data.length - 1; i++) {
            if (data[i] === this.HEADER1 && data[i + 1] === this.HEADER2) {
                const cmd = data[i + 2];
                const len = data[i + 3];

                if (cmd === 0x0c) { // Wrapper
                    let offset = i + 4;
                    const end = offset + len;
                    while (offset < end) {
                        const innerType = data[offset++];
                        if (innerType === 0x05) { // Weight
                            if (offset + 6 <= end + 1) {
                                const p = data.subarray(offset, offset + 6);
                                this.emitWeight(p);
                                offset += 6;
                            } else break;
                        } else if (innerType === 0x07) { // Timer
                            if (offset + 3 <= end + 1) {
                                const p = data.subarray(offset, offset + 3);
                                this.emitTimer(p);
                                offset += 3;
                            } else break;
                        } else {
                            break;
                        }
                    }
                    return;
                } else if (cmd === 0x05) { // Standard Weight
                    const p = data.subarray(i + 3);
                    if (p.length >= 6) {
                        this.emitWeight(p);
                    }
                } else if (cmd === 0x07) { // Standard Timer
                    const p = data.subarray(i + 3);
                    if (p.length >= 3) {
                        this.emitTimer(p);
                    }
                }
                return;
            }
        }
    }

    private emitWeight(payload: Uint8Array) {
        const raw = (payload[1] << 8) | payload[0];
        const unit = payload[4];
        let scale = 1.0;
        if (unit === 1) scale = 10.0;
        else if (unit === 2) scale = 100.0;
        else if (unit === 3) scale = 1000.0;
        else if (unit === 4) scale = 10000.0;

        let val = raw / scale;
        if ((payload[5] & 0x02) === 0x02) {
            val *= -1;
        }

        this.dispatchEvent(new CustomEvent('weight', { detail: val }));
    }

    private emitTimer(payload: Uint8Array) {
        const min = payload[0];
        const sec = payload[1];
        const dec = payload[2];
        this.dispatchEvent(new CustomEvent('timer', { detail: { min, sec, dec } }));
    }

    private emitStatus(msg: string) {
        this.dispatchEvent(new CustomEvent('status', { detail: msg }));
    }
}

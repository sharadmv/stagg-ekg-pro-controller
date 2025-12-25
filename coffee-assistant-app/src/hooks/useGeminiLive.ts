import { useState, useEffect, useRef, useCallback } from 'react';
import type { 
  GeminiResponse, 
  BrewAttempt, PartialBrewAttempt, Bean, PartialBean 
} from '../types/gemini';

const SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

const workletCode = `
class RecorderProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const float32Array = input[0];
      const int16Array = new Int16Array(float32Array.length);
      for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      this.port.postMessage(int16Array.buffer, [int16Array.buffer]);
    }
    return true;
  }
}
registerProcessor('recorder-processor', RecorderProcessor);
`;

export function useGeminiLive(onDataUpdated?: () => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draftBrew, setDraftBrew] = useState<PartialBrewAttempt | null>(null);
  const [draftBean, setDraftBean] = useState<PartialBean | null>(null);
  
  const draftBrewRef = useRef<PartialBrewAttempt | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const disconnect = useCallback(() => {
    console.log("🔌 Disconnecting...");
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    activeSourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
    activeSourcesRef.current = [];
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setIsThinking(false);
    nextStartTimeRef.current = 0;
    setDraftBrew(null);
    draftBrewRef.current = null;
    setDraftBean(null);
  }, []);

  const saveBean = useCallback((args: PartialBean) => {
    const beans: Bean[] = JSON.parse(localStorage.getItem('coffee_beans') || '[]');
    const newBean: Bean = {
      id: crypto.randomUUID?.() || Math.random().toString(36).substring(7),
      roastery: args.roastery || 'Unknown',
      name: args.name || 'Unknown',
      ...args
    };
    localStorage.setItem('coffee_beans', JSON.stringify([newBean, ...beans]));
    setDraftBean(null); // Clear draft on save
    if (onDataUpdated) onDataUpdated();
    return { success: true, bean: newBean };
  }, [onDataUpdated]);

  const updateBeanDraft = useCallback((args: PartialBean) => {
    setDraftBean(prev => ({ ...prev, ...args }));
    return { success: true };
  }, []);

  const saveBrewLog = useCallback((args: any) => {
    const logs: BrewAttempt[] = JSON.parse(localStorage.getItem('brew_logs') || '[]');
    const newLog: BrewAttempt = {
      ...args,
      ...draftBrewRef.current, // prioritize manual edits/current draft state
      id: crypto.randomUUID?.() || Math.random().toString(36).substring(7),
      date: new Date().toISOString()
    };
    localStorage.setItem('brew_logs', JSON.stringify([newLog, ...logs]));
    setDraftBrew(null);
    draftBrewRef.current = null;
    if (onDataUpdated) onDataUpdated();
    return { success: true, message: "Brew log saved successfully." };
  }, [onDataUpdated]);

  const updateDraft = useCallback((args: PartialBrewAttempt) => {
    setDraftBrew(prev => {
      const newState = { ...prev, ...args };
      draftBrewRef.current = newState;
      return newState;
    });
    return { success: true };
  }, []);

  const playAudio = useCallback((base64Data: string) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

    const bufferToUse = bytes.byteLength % 2 === 0 ? bytes.buffer : bytes.buffer.slice(0, -1);
    const pcm16 = new Int16Array(bufferToUse);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768.0;

    const buffer = ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    buffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(analyserRef.current || ctx.destination);
    if (analyserRef.current) analyserRef.current.connect(ctx.destination);

    const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
    source.start(startTime);
    nextStartTimeRef.current = startTime + buffer.duration;
    activeSourcesRef.current.push(source);
    source.onended = () => { activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source); };
  }, []);

  const connect = useCallback(async (apiKey: string, voice: string) => {
    setError(null);
    setTranscript([]);
    console.log("🚀 Attempting to connect to Gemini Live...");

    try {
      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log("✅ WebSocket Connected");
        setIsConnected(true);
        
        const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
        audioContextRef.current = ctx;
        
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = ctx.createMediaStreamSource(stream);

        const blob = new Blob([workletCode], { type: 'application/javascript' });
        const workletUrl = URL.createObjectURL(blob);
        await ctx.audioWorklet.addModule(workletUrl);
        
        const node = new AudioWorkletNode(ctx, 'recorder-processor');
        node.port.onmessage = (e) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const base64 = btoa(String.fromCharCode(...new Uint8Array(e.data)));
            wsRef.current.send(JSON.stringify({
              realtime_input: {
                media_chunks: [{ mime_type: "audio/pcm;rate=16000", data: base64 }]
              }
            }));
          }
        };
        source.connect(node);

        const setup = {
          setup: {
            model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
            generation_config: {
              response_modalities: ["audio"],
              speech_config: {
                voice_config: { prebuilt_voice_config: { voice_name: voice } }
              }
            },
            system_instruction: {
              parts: [{ text: "You are an expert Coffee Assistant. START THE SESSION by greeting the user and asking which beans from their library they are using for their brew today. 1. When a bean is mentioned, call 'get_saved_beans' first. 2. If no match, ask to add new or clarify. 3. Interactively gather the rest of the brew info (brewer, ratio, temp, method, enjoyment). 4. Use 'update_brew_draft' continuously. 5. Never read out IDs." }]
            },
            tools: [{ 'google_search': {} }, {
              functionDeclarations: [
                {
                  name: "get_saved_beans",
                  description: "Returns all saved coffee beans.",
                  parameters: { type: "object", properties: {} }
                },
                {
                  name: "update_bean_draft",
                  description: "Updates the live view of a bean being researched.",
                  parameters: {
                    type: "object",
                    properties: {
                      roastery: { type: "string" },
                      name: { type: "string" },
                      process: { type: "string" },
                      origin: { type: "string" },
                      varietal: { type: "string" },
                      roastLevel: { type: "string" },
                      notes: { type: "string" }
                    }
                  }
                },
                {
                  name: "save_bean",
                  description: "Saves a new bean.",
                  parameters: {
                    type: "object",
                    properties: {
                      roastery: { type: "string" },
                      name: { type: "string" },
                      process: { type: "string" },
                      origin: { type: "string" },
                      varietal: { type: "string" },
                      roastLevel: { type: "string" },
                      notes: { type: "string" },
                      url: { type: "string" }
                    },
                    required: ["roastery", "name"]
                  }
                },
                {
                  name: "update_brew_draft",
                  description: "Updates live draft.",
                  parameters: {
                    type: "object",
                    properties: {
                      brewer: { type: "string" },
                      beanId: { type: "string" },
                      ratio: { type: "string" },
                      waterTemp: { type: "number" },
                      technique: { type: "string" },
                      extraction: { type: "number" },
                      enjoyment: { type: "number" }
                    }
                  }
                },
                {
                  name: "save_brew_log",
                  description: "Saves final brew.",
                  parameters: {
                    type: "object",
                    properties: {
                      brewer: { type: "string" },
                      beanId: { type: "string" },
                      ratio: { type: "string" },
                      waterTemp: { type: "number" },
                      technique: { type: "string" },
                      extraction: { type: "number" },
                      enjoyment: { type: "number" }
                    },
                    required: ["brewer", "beanId", "ratio", "waterTemp", "technique", "enjoyment"]
                  }
                }
              ]
            }]
          }
        };
        ws.send(JSON.stringify(setup));
      };

      ws.onmessage = async (e) => {
        // IGNORE binary messages (audio) for JSON parsing
        if (typeof e.data !== 'string' && !(e.data instanceof Blob)) return;

        let text = e.data;
        if (text instanceof Blob) text = await text.text();
        
        try {
          const resp: GeminiResponse = JSON.parse(text);
          if (resp.setupComplete) console.log("🎯 Setup Complete");

          if (resp.toolCall) {
            setIsThinking(true);
            const responses = await Promise.all(resp.toolCall.functionCalls.map(async call => {
              console.log(`🛠️ Tool: ${call.name}`, call.args);
              let result;
              if (call.name === 'get_saved_beans') {
                // WRAP in an object, server might reject raw array
                result = { beans: JSON.parse(localStorage.getItem('coffee_beans') || '[]') };
              }
                            else if (call.name === 'save_bean') result = saveBean(call.args);
                            else if (call.name === 'save_brew_log') result = saveBrewLog(call.args);
                            else if (call.name === 'update_brew_draft') result = updateDraft(call.args);
                            else if (call.name === 'update_bean_draft') result = updateBeanDraft(call.args);
                            else result = { error: "Unknown" };
                            
                            return { name: call.name, response: result, id: call.id };
                          }));
                          
                          if (wsRef.current?.readyState === WebSocket.OPEN) {
                            const toolResp = { tool_response: { function_responses: responses } };
                            console.log("📡 Sending Tool Response:", toolResp);
                            wsRef.current.send(JSON.stringify(toolResp));
                          }
                          setIsThinking(false);
                        }
              
                        if (resp.serverContent) {
                          const parts = resp.serverContent.modelTurn?.parts;
                          if (parts) {
                            parts.forEach(p => {
                              if (p.text) setTranscript(prev => [...prev, p.text!]);
                              const audio = p.inline_data || p.inlineData;
                              if (audio?.data) playAudio(audio.data);
                            });
                          }
                          if (resp.serverContent.interrupted) {
                            activeSourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
                            activeSourcesRef.current = [];
                            nextStartTimeRef.current = audioContextRef.current?.currentTime || 0;
                          }
                        }
                        if (resp.error) {
                          console.error("❌ Gemini Error:", resp.error);
                          setError(resp.error.message);
                        }
                      } catch (err) {
                        // If it's not JSON, it might be a partial frame or binary we missed
                        console.debug("Non-JSON message received");
                      }
                    };
              
                    ws.onclose = (ev) => {
                      console.log("🔌 WS Closed:", ev.code, ev.reason);
                      disconnect();
                    };
                    
                    ws.onerror = (err) => {
                      console.error("🔌 WS Error:", err);
                      setError("WebSocket Error");
                      disconnect();
                    };
              
                  } catch (err: any) {
                    setError(err.message);
                    setIsConnected(false);
                  }
                }, [disconnect, playAudio, saveBean, saveBrewLog, updateDraft, updateBeanDraft, onDataUpdated]);
              
                useEffect(() => { return () => disconnect(); }, [disconnect]);
              
  return {
    isConnected,
    isThinking,
    transcript,
    error,
    connect,
    disconnect,
    analyserRef,
    draftBrew,
    draftBean,
    updateBrewDraft: updateDraft
  };
              }
              
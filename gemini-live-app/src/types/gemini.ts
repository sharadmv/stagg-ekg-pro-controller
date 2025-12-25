export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  inline_data?: {
    mimeType: string;
    data: string;
  };
}

export interface GeminiResponse {
  serverContent?: {
    modelTurn?: {
      parts?: GeminiPart[];
    };
    interrupted?: boolean;
    turnComplete?: boolean;
  };
  toolCall?: {
    functionCalls: {
      name: string;
      args: any;
      id: string;
    }[];
  };
  setupComplete?: Record<string, unknown>;
  error?: {
    message: string;
  };
}

export interface Bean {
  id: string;
  roastery: string;
  name: string;
  process?: string;
  origin?: string;
  varietal?: string;
  roastLevel?: string;
  notes?: string;
  url?: string;
}

export interface BrewAttempt {
  id: string;
  date: string;
  brewer: string;
  beanId: string;
  ratio: string;
  waterTemp: number;
  technique: string;
  extraction?: number;
  enjoyment: number;
}

export type PartialBrewAttempt = Partial<BrewAttempt>;
export type PartialBean = Partial<Bean>;

export interface SetupMessage {
  setup: {
    model: string;
    generation_config: {
      response_modalities: string[];
      speech_config?: {
        voice_config: VoiceConfig;
      };
    };
    system_instruction?: {
      parts: { text: string }[];
    };
    tools?: {
      functionDeclarations: {
        name: string;
        description: string;
        parameters: any;
      }[];
    }[];
  };
}

export interface VoiceConfig {
  prebuilt_voice_config: {
    voice_name: string;
  };
}

export interface ToolResponseMessage {
  tool_response: {
    function_responses: {
      name: string;
      response: any;
      id: string;
    }[];
  };
}

export interface AudioMessage {
  realtime_input: {
    media_chunks: {
      mime_type: string;
      data: string;
    }[];
  };
}
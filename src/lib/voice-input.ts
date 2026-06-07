/**
 * 语音输入会话封装。把浏览器 SpeechRecognition 的拼接 / 自动重启 /
 * 停止时摘回调 等逻辑抽出来，方便组件复用和单测。
 *
 * 关键不变量（回归测试覆盖）：
 *  1. stop() 之后，任何后到达的 onresult / onend / onerror 都不会再
 *     触发 onText / onEnd（避免发送后输入框被回填）。
 *  2. stop() 同时调用底层的 stop() + abort()，保证麦克风立刻释放。
 *  3. 用户没手动停止时，onend 会自动重启识别，且把已识别文本固化为
 *     新的 baseline，避免重启后丢失之前内容。
 *  4. 反复快速 start / stop 不会泄漏回调或重复触发 onEnd。
 *  5. onError 收到 no-speech / aborted 这种"非致命"错误时忽略，让
 *     onend 走自动重启逻辑。
 */

export interface VoiceSessionOptions {
  initialText: string;
  onText: (text: string) => void;
  onError?: (code: string) => void;
  onEnd?: () => void;
  lang?: string;
  /** 测试注入用：返回一个 SpeechRecognition 形状的对象。 */
  recognitionFactory?: () => SpeechRecognitionLike;
}

export interface VoiceSession {
  stop: () => void;
  active: () => boolean;
}

export interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: Array<Array<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
}

export function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isVoiceSupported(): boolean {
  return !!getSpeechRecognitionCtor();
}

export function startVoiceSession(opts: VoiceSessionOptions): VoiceSession | null {
  let rec: SpeechRecognitionLike | null = null;
  if (opts.recognitionFactory) {
    rec = opts.recognitionFactory();
  } else {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return null;
    rec = new Ctor();
  }
  if (!rec) return null;

  rec.lang = opts.lang ?? "zh-CN";
  rec.interimResults = true;
  rec.continuous = true;

  let baseline = opts.initialText ? opts.initialText.replace(/\s+$/, "") + " " : "";
  let latestText = opts.initialText ?? "";
  let stopped = false;
  let endedNotified = false;

  function notifyEndOnce() {
    if (endedNotified) return;
    endedNotified = true;
    opts.onEnd?.();
  }

  function detach() {
    if (!rec) return;
    try { rec.onresult = null; } catch { /* ignore */ }
    try { rec.onend = null; } catch { /* ignore */ }
    try { rec.onerror = null; } catch { /* ignore */ }
  }

  rec.onresult = (e) => {
    if (stopped) return;
    let text = "";
    for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
    latestText = baseline + text;
    opts.onText(latestText);
  };

  rec.onerror = (e) => {
    if (stopped) return;
    const code = e?.error ?? "";
    // 静音 / 主动中断属于正常状况，交给 onend 处理自动重启
    if (code === "no-speech" || code === "aborted") return;
    stopped = true;
    detach();
    opts.onError?.(code);
    notifyEndOnce();
  };

  rec.onend = () => {
    if (stopped) {
      notifyEndOnce();
      return;
    }
    // 把刚才识别到的最终文本固化进 baseline，下次继续追加
    baseline = latestText ? latestText.replace(/\s+$/, "") + " " : "";
    try {
      rec!.start();
    } catch {
      stopped = true;
      detach();
      notifyEndOnce();
    }
  };

  try {
    rec.start();
  } catch {
    detach();
    return null;
  }

  return {
    active: () => !stopped,
    stop: () => {
      if (stopped) return;
      stopped = true;
      detach();
      try { rec!.stop(); } catch { /* ignore */ }
      try { rec!.abort?.(); } catch { /* ignore */ }
      notifyEndOnce();
    },
  };
}

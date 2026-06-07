import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { build } from "esbuild";

async function importTs(source) {
  const dir = await mkdtemp(path.join(tmpdir(), "voice-input-test-"));
  const outfile = path.join(dir, "bundle.mjs");
  await build({
    entryPoints: [source],
    outfile,
    bundle: true,
    format: "esm",
    platform: "neutral",
    mainFields: ["module", "main"],
    conditions: ["import", "browser"],
    logLevel: "silent",
  });
  const mod = await import(`file://${outfile}?t=${Date.now()}`);
  await rm(dir, { recursive: true, force: true });
  return mod;
}

const { startVoiceSession } = await importTs(
  path.resolve("src/lib/voice-input.ts"),
);

/** 受测 SpeechRecognition mock：可手动触发 result / end / error。 */
function createFakeRecognition() {
  const calls = { start: 0, stop: 0, abort: 0 };
  const fake = {
    lang: "",
    interimResults: false,
    continuous: false,
    onresult: null,
    onend: null,
    onerror: null,
    start() { calls.start++; },
    stop() { calls.stop++; },
    abort() { calls.abort++; },
  };
  return {
    fake,
    calls,
    fireResult(transcript) {
      fake.onresult?.({ results: [[{ transcript }]] });
    },
    fireResults(transcripts) {
      fake.onresult?.({ results: transcripts.map((t) => [{ transcript: t }]) });
    },
    fireEnd() { fake.onend?.(); },
    fireError(code) { fake.onerror?.({ error: code }); },
  };
}

function startWith(initialText = "", overrides = {}) {
  const harness = createFakeRecognition();
  const texts = [];
  const ends = [];
  const errors = [];
  const session = startVoiceSession({
    initialText,
    onText: (t) => texts.push(t),
    onEnd: () => ends.push(true),
    onError: (e) => errors.push(e),
    recognitionFactory: () => harness.fake,
    ...overrides,
  });
  return { session, harness, texts, ends, errors };
}

test("识别结果会把 baseline 与新文本拼接后回调", () => {
  const { harness, texts } = startWith("早安");
  harness.fireResult("我想去秦皇岛");
  assert.equal(texts.at(-1), "早安 我想去秦皇岛");
});

test("stop() 之后到达的 onresult / onend 不会再触发任何回调（防止发送后回填）", () => {
  const { session, harness, texts, ends } = startWith("");
  harness.fireResult("一段话");
  assert.equal(texts.length, 1);

  session.stop();
  const endsAfterStop = ends.length;

  // 模拟底层在 stop 之后还吐出了一帧结果 + 一次 end
  harness.fireResult("不应该再出现");
  harness.fireEnd();

  assert.equal(texts.length, 1, "stop 后不应再回调 onText");
  assert.equal(ends.length, endsAfterStop, "onEnd 只应触发一次");
  assert.equal(session.active(), false);
});

test("stop() 会同时调用底层 stop 和 abort，释放麦克风", () => {
  const { session, harness } = startWith("");
  session.stop();
  assert.equal(harness.calls.stop, 1);
  assert.equal(harness.calls.abort, 1);
});

test("自然 onend 会自动重启并把已识别文本固化为新的 baseline", () => {
  const { harness, texts } = startWith("");
  harness.fireResult("第一段");
  assert.equal(texts.at(-1), "第一段");
  assert.equal(harness.calls.start, 1);

  // 浏览器静音 → onend 自动重启
  harness.fireEnd();
  assert.equal(harness.calls.start, 2, "onend 后应自动重启");

  // 重启后再来一段，应该追加在 baseline 后面
  harness.fireResult("第二段");
  assert.equal(texts.at(-1), "第一段 第二段");
});

test("no-speech / aborted 错误被忽略，交给 onend 自动重启", () => {
  const { harness, errors } = startWith("");
  harness.fireError("no-speech");
  harness.fireError("aborted");
  assert.deepEqual(errors, []);

  harness.fireEnd();
  assert.equal(harness.calls.start, 2);
});

test("致命错误会终止会话并触发一次 onEnd", () => {
  const { session, harness, errors, ends } = startWith("");
  harness.fireError("not-allowed");
  assert.deepEqual(errors, ["not-allowed"]);
  assert.equal(ends.length, 1);
  assert.equal(session.active(), false);

  // 错误后再来的事件都不应再传出
  harness.fireResult("ignored");
  harness.fireEnd();
  assert.equal(ends.length, 1);
});

test("反复快速 start / stop 不会重复触发 onEnd，也不会泄漏回调", () => {
  for (let i = 0; i < 5; i++) {
    const { session, harness, ends, texts } = startWith("");
    harness.fireResult(`hello-${i}`);
    session.stop();
    session.stop(); // 二次 stop 是 no-op
    harness.fireResult("late");
    harness.fireEnd();
    assert.equal(ends.length, 1, `第 ${i} 轮 onEnd 应只触发一次`);
    assert.equal(texts.length, 1, `第 ${i} 轮 stop 后不应再有 onText`);
    assert.equal(harness.calls.stop, 1);
    assert.equal(harness.calls.abort, 1);
  }
});

test("切换页面场景：组件卸载调用 stop 后，后续异步事件不会影响新页面", () => {
  // 模拟旧页面
  const old = startWith("");
  old.harness.fireResult("页面 A 的内容");
  old.session.stop();

  // 模拟新页面创建了新的会话
  const fresh = startWith("");
  fresh.harness.fireResult("页面 B 的内容");

  // 旧页面的底层识别还在异步吐事件
  old.harness.fireResult("迟到的回填");
  old.harness.fireEnd();
  old.harness.fireError("not-allowed");

  // 旧 session 完全沉默
  assert.equal(old.texts.length, 1);
  assert.equal(old.ends.length, 1);
  assert.equal(old.errors.length, 0);

  // 新 session 完全不受影响
  assert.equal(fresh.texts.at(-1), "页面 B 的内容");
  assert.equal(fresh.session.active(), true);
});

test("initialText 末尾空白会被规整，避免出现双空格", () => {
  const { harness, texts } = startWith("已有内容   ");
  harness.fireResult("追加");
  assert.equal(texts.at(-1), "已有内容 追加");
});

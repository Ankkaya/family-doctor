let queue: Array<{ audioBase64: string; mimeType: string }> = [];
let currentAudio: HTMLAudioElement | null = null;
let playing = false;

export function resetAudioQueue() {
  queue = [];
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  playing = false;
}

export function enqueueBase64Audio(audioBase64: string, codec: "mp3" | "wav" = "mp3") {
  if (!audioBase64) return;

  queue.push({
    audioBase64,
    mimeType: codec === "wav" ? "audio/wav" : "audio/mpeg",
  });
  void playNext();
}

async function playNext() {
  if (playing) return;

  const next = queue.shift();
  if (!next) return;

  playing = true;
  const audio = new Audio(URL.createObjectURL(base64ToBlob(next.audioBase64, next.mimeType)));
  currentAudio = audio;

  audio.onended = () => {
    cleanupAudio(audio);
    playing = false;
    void playNext();
  };
  audio.onerror = () => {
    cleanupAudio(audio);
    playing = false;
    void playNext();
  };

  try {
    await audio.play();
  } catch {
    cleanupAudio(audio);
    playing = false;
  }
}

function cleanupAudio(audio: HTMLAudioElement) {
  if (audio.src) {
    URL.revokeObjectURL(audio.src);
  }
  if (currentAudio === audio) {
    currentAudio = null;
  }
}

function base64ToBlob(base64: string, mimeType: string) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

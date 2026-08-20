"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import jsQR from "jsqr";
import { useAuthedFetch } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import type { GateResponse } from "@/lib/types";

type Phase = "scanning" | "checking" | "result" | "error";

const RESULT_LABEL: Record<GateResponse["result"], string> = {
  VALID: "VÁLIDO",
  INVALID: "INVÁLIDO",
  ALREADY_USED: "JÁ UTILIZADO",
  WRONG_EVENT: "EVENTO ERRADO",
  CANCELLED: "CANCELADO",
};

const RESULT_TONE: Record<GateResponse["result"], string> = {
  VALID: "bg-amber text-amber-ink",
  INVALID: "bg-danger text-ink",
  ALREADY_USED: "bg-surface-alt text-ink",
  WRONG_EVENT: "bg-danger text-ink",
  CANCELLED: "bg-surface-alt text-ink",
};

export function GateSession({ eventId }: { eventId: string }) {
  const authedFetch = useAuthedFetch();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  /** Trava contra chamadas duplicadas: o loop roda ~30x/s, uma resposta
   *  pode demorar mais que um frame, e sem isso o mesmo QR dispararia
   *  varias requisicoes em rajada antes da primeira resposta voltar. */
  const busyRef = useRef(false);
  /**
   * Espelha `phase` para o loop de leitura ler o valor atual sem
   * reiniciar a camera a cada troca de tela. O efeito que abre a
   * camera roda so uma vez (por evento); se o loop lesse `phase`
   * direto do estado, ficaria preso no valor de quando o efeito
   * comecou, porque a closure daquele efeito nunca e recriada.
   */
  const phaseRef = useRef<Phase>("scanning");

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [phase, setPhaseState] = useState<Phase>("scanning");
  const [result, setResult] = useState<GateResponse | null>(null);
  const [connError, setConnError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  function setPhase(next: Phase) {
    phaseRef.current = next;
    setPhaseState(next);
  }

  const validate = useCallback(
    async (body: { payload?: string } | { code?: string }) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setPhase("checking");
      try {
        const res = await authedFetch<GateResponse>("/gate/validate", {
          method: "POST",
          body: { eventId, ...body },
        });
        setResult(res);
        setPhase("result");
      } catch (err) {
        /**
         * Falha de conexao NUNCA vira "INVALIDO" na tela. Um ingresso
         * legitimo negado por um erro de rede seria muito mais grave
         * do que so avisar que a checagem falhou e pedir para repetir.
         */
        setConnError(err instanceof ApiError ? err.message : "Falha ao conectar com o servidor.");
        setPhase("error");
      } finally {
        busyRef.current = false;
      }
    },
    [authedFetch, eventId],
  );

  const reset = useCallback(() => {
    setResult(null);
    setConnError(null);
    setPhase("scanning");
  }, []);

  /** Some sozinho depois de um tempo, ou no toque, o que vier primeiro. */
  useEffect(() => {
    if (phase !== "result") return;
    const timer = setTimeout(reset, 2500);
    return () => clearTimeout(timer);
  }, [phase, reset]);

  useEffect(() => {
    let cancelled = false;

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(frame.data, frame.width, frame.height);
          if (code?.data && phaseRef.current === "scanning") {
            validate({ payload: code.data });
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch {
        setCameraError("Não foi possível acessar a câmera. Use o código digitado abaixo.");
      }
    }

    start();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [eventId, validate]);

  async function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    const code = manualCode.trim().toUpperCase();
    if (!code) return;
    await validate({ code });
    setManualCode("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="poster-frame relative bg-surface border border-line-soft overflow-hidden aspect-[3/4] max-w-xs mx-auto w-full">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />

        {phase === "checking" && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/70">
            <span className="font-mono text-xs text-ink tracking-wider">VERIFICANDO...</span>
          </div>
        )}

        {phase === "result" && result && (
          <button
            type="button"
            onClick={reset}
            className={`absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 ${RESULT_TONE[result.result]}`}
          >
            <span className="font-display text-2xl font-semibold uppercase tracking-wide">
              {RESULT_LABEL[result.result]}
            </span>
            {result.ticket && (
              <div className="text-center text-sm">
                <p>{result.ticket.holderName}</p>
                <p className="opacity-80">
                  {result.ticket.sector}
                  {result.ticket.seat ? ` · ${result.ticket.seat}` : ""}
                </p>
              </div>
            )}
            <span className="font-mono text-[10px] opacity-70 mt-2">toque para continuar</span>
          </button>
        )}

        {phase === "error" && (
          <button
            type="button"
            onClick={reset}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 bg-surface-alt"
          >
            <span className="font-mono text-sm text-danger">NÃO FOI POSSÍVEL VERIFICAR</span>
            <p className="text-xs text-muted text-center">{connError}</p>
            <span className="font-mono text-[10px] text-muted-2 mt-2">toque para tentar de novo</span>
          </button>
        )}
      </div>

      {cameraError && <p className="text-xs text-danger text-center">{cameraError}</p>}

      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-surface border border-line-soft px-3 focus-within:border-amber-dim transition-colors">
          <span className="font-mono text-[9px] tracking-[0.14em] text-muted-2 shrink-0">
            CÓDIGO
          </span>
          <span className="w-px h-4 bg-line shrink-0" />
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="ELT-XXXXX-XXXXX"
            className="flex-1 min-w-0 bg-transparent py-2.5 text-sm text-ink font-mono uppercase placeholder:normal-case placeholder:text-muted-2 outline-none"
          />
        </div>
        <button type="submit" className="stamp-btn px-4">
          VALIDAR
        </button>
      </form>
    </div>
  );
}
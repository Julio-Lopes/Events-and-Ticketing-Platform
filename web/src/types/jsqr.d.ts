/**
 * jsqr nao publica tipos, e nao existe @types/jsqr no registro do npm.
 * Declaracao minima, so com o que este projeto usa: o export default
 * que recebe os pixels do canvas e devolve o texto decodificado ou null.
 */
declare module "jsqr" {
  interface QRPoint {
    x: number;
    y: number;
  }

  interface QRCode {
    data: string;
    location: {
      topLeftCorner: QRPoint;
      topRightCorner: QRPoint;
      bottomLeftCorner: QRPoint;
      bottomRightCorner: QRPoint;
    };
  }

  function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: { inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst" },
  ): QRCode | null;

  export default jsQR;
}
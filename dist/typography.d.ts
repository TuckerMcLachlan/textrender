export interface TextMask {
    pixels: Uint8Array;
    width: number;
    height: number;
    cssWidth: number;
    cssHeight: number;
    left: number;
    top: number;
    scaleX: number;
    scaleY: number;
    fontSize: number;
    distanceRange: number;
}
export declare function typographySignature(element: HTMLElement): string;
export declare function createTextMask(element: HTMLElement, maxTextureSize: number): TextMask | null;

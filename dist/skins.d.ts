import type { OptionsFor, SkinName } from './types';
export type SkinDefinition<S extends SkinName> = {
    readonly id: S;
    readonly label: string;
    readonly fragment: string;
    readonly defaults: Required<OptionsFor<S>>;
};
export declare const resin: {
    id: "resin";
    label: string;
    defaults: {
        puff: number;
        baseColor: string;
        shadowColor: string;
        bounceShadowColor: string;
        highlightColor: string;
        roundness: number;
        depth: number;
        smoothing: number;
        lightX: number;
        lightY: number;
        lightZ: number;
        highlightSize: number;
        gloss: number;
        brightness: number;
        bounceStrength: number;
    };
    fragment: string;
};
export declare const skins: {
    readonly [S in SkinName]: SkinDefinition<S>;
};

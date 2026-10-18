import type { SkinName } from './types';
type PuffSkin = {
    readonly id: SkinName;
    readonly label: string;
    readonly fragment: string;
};
export declare const puff: PuffSkin;
export declare const skins: Readonly<Record<SkinName, PuffSkin>>;
export {};

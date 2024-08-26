import { Plugin, Viewer } from "../../viewer";

export declare class SectionCapsPlugin extends Plugin {

    constructor(viewer: Viewer, cfg: SectionCapsPluginConfiguration);

    set enabled(value: boolean);

    get enabled(): boolean;

    set opacityThreshold(value: number);

    get opacityThreshold(): number;

    destroy(): void;
}
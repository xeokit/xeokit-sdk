import { Viewer } from "../../../viewer";
import { PointerCircle } from "../../../extras/PointerCircle";

type Cleanup = () => void;

type OnCancel = () => void;
type OnChange = () => void;
type OnCommit = () => void;

type Ray2WorldPos = (origin: number[], direction: number[]) => boolean | number[];

declare function touchPointSelector(viewer: Viewer, pointerCircle: PointerCircle, ray2WorldPos: Ray2WorldPos): (onCancel: OnCancel, onChange: OnChange, onCommit: OnCommit) => Cleanup;
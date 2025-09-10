import { Viewer } from "../../../viewer";
import { PointerCircle } from "../../../extras/PointerCircle";

type Vec2 = number[]
type Vec3 = number[]
type Ray2WorldPos<T> = (origin: Vec3, direction: Vec3) => T | null;

type Cleanup = () => void;

type OnCancel = () => void;
type OnChange<T> = (canvasPos: Vec2, worldPos: T | null) => void;
type OnCommit<T> = (canvasPos: Vec2, worldPos: T | null) => void;


declare function touchPointSelector<T>(viewer: Viewer, pointerCircle: PointerCircle, ray2WorldPos: Ray2WorldPos<T>): (onCancel: OnCancel, onChange: OnChange<T>, onCommit: OnCommit<T>) => Cleanup;
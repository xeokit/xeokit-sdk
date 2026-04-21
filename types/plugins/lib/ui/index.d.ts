import { Viewer } from "../../../viewer";
import { PointerCircle } from "../../../extras/PointerCircle";
import { CameraControl } from "../../../viewer/scene/CameraControl/CameraControl";

type Vec2 = number[]
type Vec3 = number[]
type Ray2WorldPos<T> = (origin: Vec3, direction: Vec3) => T | null;

type Cleanup = () => void;

type OnCancel = () => void;
type OnChange<T> = (canvasPos: Vec2, worldPos: T | null) => void;
type OnCommit<T> = (canvasPos: Vec2, worldPos: T | null) => void;


declare function touchPointSelector<T>(viewer: Viewer, pointerCircle: PointerCircle, ray2WorldPos: Ray2WorldPos<T>): (onCancel: OnCancel, onChange: OnChange<T>, onCommit: OnCommit<T>) => Cleanup;

declare function addMousePressListener(element: HTMLElement, onChange: (canvasPos: Vec2 | null) => void): Cleanup;

declare function addTouchPressListener(element: HTMLElement, cameraControl: CameraControl, pointerCircle: PointerCircle, onChange: (canvasPos: Vec2 | null) => void): Cleanup;

import {expect, test} from "@playwright/test";

for (const mouseEvent of ["mouseenter", "mousedown"]) {
    test(`canvas ${mouseEvent} clears Shift after a missed keyup`, async ({page}) => {
        await page.goto("http://localhost:8080");
        const states = await page.evaluate(async (mouseEvent) => {
            const {Input} = await import("/src/viewer/scene/input/Input.js");
            const canvas = document.body.appendChild(document.createElement("canvas"));
            const outside = document.body.appendChild(document.createElement("button"));
            const scene = {type: "Scene", _addComponent() {}, _own() {}, tickify(fn) { return fn; }};
            const input = new Input(scene, {element: canvas});
            const events = [];
            input.on(mouseEvent, () => events.push([input.shiftDown, input.keyDown[input.KEY_SHIFT]]));

            const pressShift = () => document.dispatchEvent(
                new KeyboardEvent("keydown", {key: "Shift", keyCode: input.KEY_SHIFT, shiftKey: true})
            );
            pressShift();
            canvas.dispatchEvent(new MouseEvent(mouseEvent, {shiftKey: true}));

            // The native menu can consume the keyup before it reaches the document.
            outside.dispatchEvent(new MouseEvent("contextmenu", {button: 2, shiftKey: true}));
            canvas.dispatchEvent(new MouseEvent(mouseEvent, {shiftKey: false}));
            return events;
        }, mouseEvent);

        expect(states).toEqual([[true, true], [false, false]]);
    });
}

test("the camera rotates on the first drag after a missed Shift keyup", async ({page}) => {
    await page.goto("http://localhost:8080");
    await page.evaluate(async () => {
        const {Input} = await import("/src/viewer/scene/input/Input.js");
        const {MousePanRotateDollyHandler} = await import(
            "/src/viewer/scene/CameraControl/lib/handlers/MousePanRotateDollyHandler.js"
        );
        document.body.innerHTML = '<canvas width="200" height="160"></canvas><button>Outside</button>';
        const canvas = document.querySelector("canvas");
        const scene = {
            type: "Scene",
            _addComponent() {},
            _own() {},
            tickify(fn) { return fn; },
            canvas: {canvas, boundary: [0, 0, 200, 160]},
            camera: {projection: "perspective", eyeLookDist: 10, perspective: {fov: 60}}
        };
        const input = scene.input = new Input(scene, {element: canvas});
        const states = {pointerCanvasPos: [0, 0]};
        document.addEventListener("mousemove", event => {
            states.pointerCanvasPos = [event.clientX, event.clientY];
        });
        const updates = window.cameraDragUpdates = {panDeltaX: 0, panDeltaY: 0, rotateDeltaX: 0, rotateDeltaY: 0};
        const cameraControl = {
            MOUSE_PAN: "pan",
            MOUSE_ROTATE: "rotate",
            _isKeyDownForAction(action, keys) {
                return keys[input.MOUSE_LEFT_BUTTON] && (action === "rotate" || keys[input.KEY_SHIFT]);
            }
        };
        new MousePanRotateDollyHandler(scene, {cameraControl, pickController: {update() {}}},
            {active: true, pointerEnabled: true, dragRotationRate: 1}, states, updates);
    });

    const bounds = await page.locator("canvas").boundingBox();
    const drag = async () => {
        await page.mouse.move(bounds.x + 25, bounds.y + 25);
        await page.mouse.down();
        await page.mouse.move(bounds.x + 60, bounds.y + 45);
        await page.mouse.up();
        return page.evaluate(() => {
            const {panDeltaX, rotateDeltaY} = window.cameraDragUpdates;
            Object.assign(window.cameraDragUpdates, {panDeltaX: 0, panDeltaY: 0, rotateDeltaX: 0, rotateDeltaY: 0});
            return {panDeltaX, rotateDeltaY};
        });
    };

    await page.keyboard.down("Shift");
    const held = await drag();
    expect(held.panDeltaX).toBeGreaterThan(0);
    expect(held.rotateDeltaY).toBe(0);

    await page.getByRole("button").hover();
    await page.getByRole("button").dispatchEvent("contextmenu", {button: 2, shiftKey: true});
    await page.evaluate(() => window.addEventListener("keyup", event => event.stopImmediatePropagation(),
        {capture: true, once: true}));
    await page.keyboard.up("Shift");

    const released = await drag();
    expect(released.panDeltaX).toBe(0);
    expect(released.rotateDeltaY).toBeLessThan(0);
});

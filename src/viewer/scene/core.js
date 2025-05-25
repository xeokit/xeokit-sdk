import { stats } from './stats.js';
import { utils } from './utils.js';
import { Map } from './utils/Map.js';
import { Queue } from './utils/Queue.js';

const scenesRenderInfo = {}; // Used for throttling FPS for each Scene
const sceneIDMap = new Map(); // Ensures unique scene IDs
const taskQueue = new Queue(); // Task queue, which is pumped on each frame; tasks are pushed to it with calls to xeokit.schedule
const tickEvent = {sceneId: null, time: null, startTime: null, prevTime: null, deltaTime: null};
const taskBudget = 10; // Millisecs we're allowed to spend on tasks in each frame
const fpsSamples = [];
const numFPSSamples = 30;

let lastTime = 0;
let elapsedTime;
let totalFPS = 0;


/**
 * @private
 */
function Core() {

    /**
     Semantic version number. The value for this is set by an expression that's concatenated to
     the end of the built binary by the xeokit build script.
     @property version
     @namespace xeokit
     @type {String}
     */
    this.version = "1.0.0";

    /**
     Existing {@link Scene}s , mapped to their IDs
     @property scenes
     @namespace xeokit
     @type {Scene}
     */
    this.scenes = {};

    this._superTypes = {}; // For each component type, a list of its supertypes, ordered upwards in the hierarchy.

    /**
     * Registers a scene on xeokit.
     * This is called within the xeokit.Scene constructor.
     * @private
     */
    this._addScene = function (scene) {
        if (scene.id) { // User-supplied ID
            if (core.scenes[scene.id]) {
                console.error(`[ERROR] Scene ${utils.inQuotes(scene.id)} already exists`);
                return;
            }
        } else { // Auto-generated ID
            scene.id = sceneIDMap.addItem({});
        }
        core.scenes[scene.id] = scene;
        const ticksPerOcclusionTest = scene.ticksPerOcclusionTest;
        const ticksPerRender = scene.ticksPerRender;
        scenesRenderInfo[scene.id] = {
            ticksPerOcclusionTest: ticksPerOcclusionTest,
            ticksPerRender: ticksPerRender,
            renderCountdown: ticksPerRender
        };
        stats.components.scenes++;
        scene.once("destroyed", () => { // Unregister destroyed scenes
            sceneIDMap.removeItem(scene.id);
            delete core.scenes[scene.id];
            delete scenesRenderInfo[scene.id];
            stats.components.scenes--;
        });
    };

    /**
     * @private
     */
    this.clear = function () {
        let scene;
        for (const id in core.scenes) {
            if (core.scenes.hasOwnProperty(id)) {
                scene = core.scenes[id];
                // Only clear the default Scene
                // but destroy all the others
                if (id === "default.scene") {
                    scene.clear();
                } else {
                    scene.destroy();
                    delete core.scenes[scene.id];
                }
            }
        }
    };

    /**
     * Schedule a task to run at the next frame.
     *
     * Internally, this pushes the task to a FIFO queue. Within each frame interval, xeokit processes the queue
     * for a certain period of time, popping tasks and running them. After each frame interval, tasks that did not
     * get a chance to run during the task are left in the queue to be run next time.
     *
     * @param {Function} callback Callback that runs the task.
     * @param {Object} [scope] Scope for the callback.
     */
    this.scheduleTask = function (callback, scope = null) {
        taskQueue.push(callback);
        taskQueue.push(scope);
    };

    this.runTasks = function (until = -1) { // Pops and processes tasks in the queue, until the given number of milliseconds has elapsed.
        let time = (new Date()).getTime();
        let callback;
        let scope;
        let tasksRun = 0;
        while (taskQueue.length > 0 && (until < 0 || time < until)) {
            callback = taskQueue.shift();
            scope = taskQueue.shift();
            if (scope) {
                callback.call(scope);
            } else {
                callback();
            }
            time = (new Date()).getTime();
            tasksRun++;
        }
        return tasksRun;
    };

    this.getNumTasks = function () {
        return taskQueue.length;
    };
}

/**
 * @private
 * @type {Core}
 */
const core = new Core();

const frame = function () {
    let time = Date.now();
    elapsedTime = time - lastTime;
    if (lastTime > 0 && elapsedTime > 0) { // Log FPS stats
        var newFPS = 1000 / elapsedTime; // Moving average of FPS
        totalFPS += newFPS;
        fpsSamples.push(newFPS);
        if (fpsSamples.length >= numFPSSamples) {
            totalFPS -= fpsSamples.shift();
        }
        stats.frame.fps = Math.round(totalFPS / fpsSamples.length);
    }
    for (let id in core.scenes) {
        core.scenes[id].compile();
    }
    runTasks(time);
    lastTime = time;
};

function customSetInterval(callback, interval) {
    let expected = Date.now() + interval;
    function loop() {
        const elapsed = Date.now() - expected;
        callback();
        expected += interval;
        setTimeout(loop, Math.max(0, interval - elapsed));
    }
    loop();
    return {
        cancel: function() {
            // No need to do anything, setTimeout cannot be directly cancelled
        }
    };
}

customSetInterval(() => {
    frame();
}, 100);

const renderFrame = function () {
    let time = Date.now();
    elapsedTime = time - lastTime;
    if (lastTime > 0 && elapsedTime > 0) { // Log FPS stats
        var newFPS = 1000 / elapsedTime; // Moving average of FPS
        totalFPS += newFPS;
        fpsSamples.push(newFPS);
        if (fpsSamples.length >= numFPSSamples) {
            totalFPS -= fpsSamples.shift();
        }
        stats.frame.fps = Math.round(totalFPS / fpsSamples.length);
    }
    runTasks(time);
    fireTickEvents(time);
    renderScenes();
    (window.requestPostAnimationFrame !== undefined) ? window.requestPostAnimationFrame(frame) : requestAnimationFrame(renderFrame);
};

renderFrame();

function runTasks(time) { // Process as many enqueued tasks as we can within the per-frame task budget
    const tasksRun = core.runTasks(time + taskBudget);
    const tasksScheduled = core.getNumTasks();
    stats.frame.tasksRun = tasksRun;
    stats.frame.tasksScheduled = tasksScheduled;
    stats.frame.tasksBudget = taskBudget;
}

function fireTickEvents(time) { // Fire tick event on each Scene
    tickEvent.time = time;
    for (var id in core.scenes) {
        if (core.scenes.hasOwnProperty(id)) {
            var scene = core.scenes[id];
            tickEvent.sceneId = id;
            tickEvent.startTime = scene.startTime;
            tickEvent.deltaTime = tickEvent.prevTime != null ? tickEvent.time - tickEvent.prevTime : 0;
            /**
             * Fired on each game loop iteration.
             *
             * @event tick
             * @param {String} sceneID The ID of this Scene.
             * @param {Number} startTime The time in seconds since 1970 that this Scene was instantiated.
             * @param {Number} time The time in seconds since 1970 of this "tick" event.
             * @param {Number} prevTime The time of the previous "tick" event from this Scene.
             * @param {Number} deltaTime The time in seconds since the previous "tick" event from this Scene.
             */
            scene.fire("tick", tickEvent, true);
        }
    }
    tickEvent.prevTime = time;
}

function renderScenes() {
    const scenes = core.scenes;
    const forceRender = false;
    let scene;
    let renderInfo;
    let ticksPerOcclusionTest;
    let ticksPerRender;
    let id;
    for (id in scenes) {
        if (scenes.hasOwnProperty(id)) {
            scene = scenes[id];
            renderInfo = scenesRenderInfo[id];

            if (!scene.rendering) return;

            if (!renderInfo) {
                renderInfo = scenesRenderInfo[id] = {}; // FIXME
            }

            ticksPerOcclusionTest = scene.ticksPerOcclusionTest;
            if (renderInfo.ticksPerOcclusionTest !== ticksPerOcclusionTest) {
                renderInfo.ticksPerOcclusionTest = ticksPerOcclusionTest;
                renderInfo.renderCountdown = ticksPerOcclusionTest;
            }
            if (--scene.occlusionTestCountdown <= 0) {
                scene.doOcclusionTest();
                scene.occlusionTestCountdown = ticksPerOcclusionTest;
            }

            ticksPerRender = scene.ticksPerRender;
            if (renderInfo.ticksPerRender !== ticksPerRender) {
                renderInfo.ticksPerRender = ticksPerRender;
                renderInfo.renderCountdown = ticksPerRender;
            }
            if (--renderInfo.renderCountdown === 0) {
                scene.render(forceRender);
                renderInfo.renderCountdown = ticksPerRender;
            }
        }
    }
}

export { core };

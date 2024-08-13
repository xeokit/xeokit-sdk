import {math} from "../../dist/xeokit-sdk.min.es.js";
/**
 * A function that can act as a stand-in template for Scene::pick.
 *
 * The details that might require tweaking for a particular use-case are:
 *
 * 1. `rayOriginPrecision` and `rayDirectionPrecision` variables:
 * These determine how sensitive the overlapping cycle is to slight picking ray changes.
 * Both variables set to zero will allow no tolerance for a ray change,
 * so the pick will have to happen with exactly same ray.
 *
 * 2. `const pickResult = viewer.scene.pick(...)` call
 * Depending on a specific use-case, the actual pick call might require other Scene::pick parameters to be used
 */

export const overlappingPick = (function() {

    // Arbitrary values - depends on required end-user precision
    const rayOriginPrecision = 0.001;
    const rayDirectionPrecision = 0.2 * math.DEGTORAD;

    let alreadyPicked = [ ];
    let recentPickEntity = null;
    let referenceRay = null;

    const sentinel = { };

    return function(scene, pickRay, { wrapAround = false, pickCloser = false } = { }) {
        const rayChanged = referenceRay && ((math.distVec3(pickRay.origin, referenceRay.origin) > rayOriginPrecision)
                                            ||
                                            (math.angleVec3(pickRay.direction, referenceRay.direction) > (rayDirectionPrecision)));

        if ((! referenceRay) || rayChanged) {
            referenceRay = { origin: pickRay.origin, direction: pickRay.direction };
        }

        if (rayChanged)
        {
            // If ray is different than before, than make all ignored entities pickable again
            alreadyPicked.forEach(i => i.pickable = true);
            alreadyPicked = [ ];
        }

        if (pickCloser)
        {
            for (let i = 0; i < 2; ++i) {
                if (alreadyPicked.length > 0)
                    alreadyPicked.pop().pickable = true;
            }
        }

        return (function pick(resetAndRepeat) {

            // The following Scene::pick call might require some configuration according to the use-case
            const pickResult = scene.pick({ origin: referenceRay.origin, direction: referenceRay.direction });

            const pickEntity = pickResult && pickResult.entity;
            if (pickEntity)
            {
                if (rayChanged && (pickEntity === recentPickEntity) && (! pickCloser)) {
                    // This happens when:
                    // 1. Some entity had already been picked
                    // 2. A camera was just moved
                    // 3. The previously-picked entity is being picked again, so we skip it
                    alreadyPicked.push(pickEntity);
                    pickEntity.pickable = false;
                    return pick(true);
                }
                else
                {
                    alreadyPicked.push(pickEntity);
                    pickEntity.pickable = false;
                    recentPickEntity = pickEntity;
                    return pickResult;
                }
            }
            else if (wrapAround && resetAndRepeat && (alreadyPicked.length > 0))
            {
                // If no entity got picked then reenable all ignored entities and start the cycle over
                alreadyPicked.forEach(i => i.pickable = true);
                alreadyPicked = [ ];
                return pick(false);
            }
            else
            {
                if ((alreadyPicked.length > 0) && (alreadyPicked[alreadyPicked.length - 1] !== sentinel)) {
                    alreadyPicked.push(sentinel); // mock object to be popped for pickCloser
                }
                recentPickEntity = null;
                return null;
            }
        })(true);
    };
})();

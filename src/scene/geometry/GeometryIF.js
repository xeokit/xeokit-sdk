/**
 * @desc A geometry component within a {@link Scene}.
 *
 * @interface
 * @abstract
 */
class GeometryIF {

    /**
     * Returns true to indicate that this is a GeometryIF.
     * @type {Boolean}
     * @abstract
     */
    get isGeometry() {
    }

    /**
     * Gets the Geometry's primitive type.
     *
     * Valid types are: 'points', 'lines', 'line-loop', 'line-strip', 'triangles', 'triangle-strip' and 'triangle-fan'.
     * Default value is ````"triangles"````.
     *
     * @type {String}
     * @abstract
     */
    get primitive() {
    }

    /**
     * Gets if this Geometry is internally compressed.
     *
     * Compression is an internally-performed optimization which stores positions, colors, normals and UVs in quantized and oct-encoded formats for reduced memory footprint and GPU bus usage.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     * @abstract
     */
    get compressGeometry() {
    }

    /**
     * Gets the local-space axis-aligned 3D boundary (AABB) of this geometry.
     *
     * The AABB is represented by a six-element Float32Array containing the min/max extents of the axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
     *
     * @type {Float32Array}
     * @abstract
     */
    get aabb() {
    }
}

export {GeometryIF};
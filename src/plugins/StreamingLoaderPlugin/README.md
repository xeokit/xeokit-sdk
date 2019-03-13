## Objective

Design a client-server protocol for downloading IFC models
extracted from glTF that transmits the minimal amount of data over the
wire, while allowing the client to efficiently construct scene content
for rendering using geometry instancing and batching techniques.

A server-side process would parse the glTF and populate a database with data
which would then be served to clients by an asset server.

A model consists of **objects** which contain **meshes**, which contain or reuse **geometries**. The idea is that each mesh represents a portion of an object, with its own unique color etc. An example would be a window object, which has a mesh for the glass pane, another mesh for the window frame, a mesh representing the lock, and so on. Each mesh belongs to exactly one
object. Meshes can each have their own unique geometry, or share a geometry with other meshes. When meshes reuse geometries, then xeokit will render them using WebGL *instanced arrays*. When meshes have their own uique geometries, xeokit will glue those geometries together into *geometry batches*, to render with a single draw call.

As it parses the glTF, the server parser would create geometries, meshes
and entities within a database, along with a JSON manifest.

## Manifest

The manifest contains the bare outline of a 3D model.

When a client loads a model, the first thing they load is the manifest,
which contains a record for each object in the model.

Each manifest object contains:

 * the object's ID
 * the object's IFC type
 * the object's World-space axis-aligned 3D boundary

````json
// Server response providing model manifest
{
    "objects": [
        {
            id: "myObject1",
            ifcType: "IfcWall",
            aabb: [-100.00, -34.0, 12.0, 24.0, 10.0, 39.0]
        },
        {
            id: "myObject2",
            ifcType: "IfcSlab",
            aabb: [-150.00, -134.0, 22.0, 24.0, 13.0, 49.0]
        },
        {
            //...
        },
        //...
    }
}
````

## Meshes and Objects

Having loaded a model manifest, a client can then request objects from
 the server as required:

````json
// Client request for objects
 {
     message: "getObjects",
     meshIds: ["myObject1", "myObject2"]
 }
````

Server responds with:

````json
// Server response providing requested objects
{
    "objects": [
        {
            objectId: "myObject1",
            meshes: [
                {
                    id: "myMesh1",
                    positions: [...],
                    normals: [...],
                    indices: [...],
                    color: [0.5, 0.0, 0.0],
                    opacity: 1.0
                },
                {
                    id: "myMesh2",
                    positions: [...],
                    normals: [...],
                    indices: [...],
                    matrix: [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
                    color: [0.0, 1.0, 0.0],
                    opacity: 1.0
                }
            ]
        },
        {
            id: "myObject2",
            meshes: [
                {
                    id: "myMesh2",
                    geometryId: "myGeometry1",
                    color: [0.0, 1.0, 0.0],
                    opacity: 1.0
                },
                {
                    id:"myMesh3",
                    geometryId: "myGeometry1",
                    color: [0.0, 1.0, 1.0],
                    opacity: 1.0
                }
            ]
        }
    ]
}
````

 A geometry can be shared by two or more meshes, or may be used by a single mesh. When used by a single mesh, the geometry is supplied within that mesh's data. When shared, the mesh contains the ID if the geometry and the client must request that geometry.

The first two meshes contain geometry arrays, because they each have their own unique geometry. Client then creates those meshes immediately.

The third and fourth meshes have the ID of a geometry they share. If the client has not yet requested that geometry then it requests using the message format shown below. Otherwise, if the client already has that geometry, it would go ahead and create the third and fourth meshes.

Note that the server is stateless, meaning that it does not track whether the client has already downloaded the shared geometry.

````json
// Client request for geometries
{
     message: "getGeometries",
     meshIds: ["myGeometry1"]
}
````


The server provides the requested geometry(s) like so:

````json
// Server response providing geometries shared by multiple meshes
{
    "geometries": [
        {
            id: "myGeometry",
            numInstances: 2,
            positions: [...],
            normals: [...],
            indices: [....]
        },
        //...
    ]
}
````

The ````numInstances```` property indicates how many meshes use the geometry. The server is able to determine that from parsing the glTF, and the client is
able to "finalize" a set of meshes that instance that geometry as soon as the
number of those meshes equals ````numInstances````.


## Future work

### Compress geometry

* Have the parser quantize the positions and normals for each geometry, converting them to 16-bit and 8-bit integers, and accompanying them with a 4x4 de-quantization matrix.

Quantization involves converting floats to integers within a given value range, by scaling and offsetting them. De-quantization involves converting them back by dividing them by that scalar and subtracting the offset. The scalar and offset are provided in a 4x4 transformation matrix, which is multiplied by each position within the WebGL vertex shader before the position is used in the shader.

For the geometries that are each used by exactly one mesh, the server quantizes those using the same global scale and offset values, which are derived from the 3D boundaries of the model. For those, the server provides a single, global dequantization matrix within the model manifest:


````json
// Server response providing the model manifest
{
    "objects": [
        {
            id: "myObject",
            ifcType: "IfcWall",
            aabb: [-100.00, -34.0, 12.0, 24.0, 10.0, 39.0]
        },
        {
            id: "myObject2",
            ifcType: "IfcSlab",
            aabb: [-150.00, -134.0, 22.0, 24.0, 13.0, 49.0]
        },
        {
            //...
        },
        //...
    },
    "decodeMatrix": [...]
}
 ````

For each geometry that is used by a single mesh, the server generates it matrix from the extents of the geometry's positions, so the matrix is relevant onto to that geometry, and so the server includes it within the data for its mesh:

````json
// Server response providing requested objects
{
    "objects": [
        {
            objectId: "myObject1",
            meshes: [
                {
                    id: "myMesh1",
                    positions: [...compressed to integers...],
                    normals: [...compressed to integers...],
                    indices: [...],
                    color: [0.5, 0.0, 0.0],
                    opacity: 1.0,
                    "decodeMatrix": [...]
                },
                {
                    id: "myMesh2",
                    positions: [...compressed to integers...],
                    normals: [...compressed to integers...],
                    indices: [...],
                    decodeMatrix: [...], // <<---- dequantization matrix
                    color: [0.0, 1.0, 0.0],
                    opacity: 1.0,
                    "decodeMatrix": [...]
                }
            ]
        },
        {
            objectId: "myObject1",
            meshes: [
                {
                    id: "myMesh2",
                    geometryId: "myGeometry1",
                    color: [0.0, 1.0, 0.0],
                    opacity: 1.0
                },
                {
                    id:"myMesh3",
                    geometryId: "myGeometry1",
                    color: [0.0, 1.0, 1.0],
                    opacity: 1.0
                }
            ]
        }
    ]
}
````


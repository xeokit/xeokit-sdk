var module = {};
var exports = {};

(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.RBush3D = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var quickselect = require('quickselect');
var nodePool = [];
var freeNode = function (node) { return nodePool.push(node); };
var freeAllNode = function (node) {
    if (node) {
        freeNode(node);
        if (!isLeaf(node)) {
            node.children.forEach(freeAllNode);
        }
    }
};
var allowNode = function (children) {
    var node = nodePool.pop();
    if (node) {
        node.children = children;
        node.height = 1;
        node.leaf = true;
        node.minX = Infinity;
        node.minY = Infinity;
        node.minZ = Infinity;
        node.maxX = -Infinity;
        node.maxY = -Infinity;
        node.maxZ = -Infinity;
    }
    else {
        node = {
            children: children,
            height: 1,
            leaf: true,
            minX: Infinity,
            minY: Infinity,
            minZ: Infinity,
            maxX: -Infinity,
            maxY: -Infinity,
            maxZ: -Infinity,
        };
    }
    return node;
};
var distNodePool = [];
var freeDistNode = function (node) { return distNodePool.push(node); };
var allowDistNode = function (dist, node) {
    var heapNode = distNodePool.pop();
    if (heapNode) {
        heapNode.dist = dist;
        heapNode.node = node;
    }
    else {
        heapNode = { dist: dist, node: node };
    }
    return heapNode;
};
var isLeaf = function (node) {
    return node.leaf;
};
var isLeafChild = function (node, child) {
    return node.leaf;
};
var findItem = function (item, items, equalsFn) {
    if (!equalsFn)
        return items.indexOf(item);
    for (var i = 0; i < items.length; i++) {
        if (equalsFn(item, items[i]))
            return i;
    }
    return -1;
};
var calcBBox = function (node) {
    distBBox(node, 0, node.children.length, node);
};
var distBBox = function (node, k, p, destNode) {
    var dNode = destNode;
    if (dNode) {
        dNode.minX = Infinity;
        dNode.minY = Infinity;
        dNode.minZ = Infinity;
        dNode.maxX = -Infinity;
        dNode.maxY = -Infinity;
        dNode.maxZ = -Infinity;
    }
    else {
        dNode = allowNode([]);
    }
    for (var i = k, child = void 0; i < p; i++) {
        child = node.children[i];
        extend(dNode, child);
    }
    return dNode;
};
var extend = function (a, b) {
    a.minX = Math.min(a.minX, b.minX);
    a.minY = Math.min(a.minY, b.minY);
    a.minZ = Math.min(a.minZ, b.minZ);
    a.maxX = Math.max(a.maxX, b.maxX);
    a.maxY = Math.max(a.maxY, b.maxY);
    a.maxZ = Math.max(a.maxZ, b.maxZ);
    return a;
};
var bboxVolume = function (a) {
    return (a.maxX - a.minX) *
        (a.maxY - a.minY) *
        (a.maxZ - a.minZ);
};
var bboxMargin = function (a) {
    return (a.maxX - a.minX) +
        (a.maxY - a.minY) +
        (a.maxZ - a.minZ);
};
var enlargedVolume = function (a, b) {
    var minX = Math.min(a.minX, b.minX), minY = Math.min(a.minY, b.minY), minZ = Math.min(a.minZ, b.minZ), maxX = Math.max(a.maxX, b.maxX), maxY = Math.max(a.maxY, b.maxY), maxZ = Math.max(a.maxZ, b.maxZ);
    return (maxX - minX) *
        (maxY - minY) *
        (maxZ - minZ);
};
var intersectionVolume = function (a, b) {
    var minX = Math.max(a.minX, b.minX), minY = Math.max(a.minY, b.minY), minZ = Math.max(a.minZ, b.minZ), maxX = Math.min(a.maxX, b.maxX), maxY = Math.min(a.maxY, b.maxY), maxZ = Math.min(a.maxZ, b.maxZ);
    return Math.max(0, maxX - minX) *
        Math.max(0, maxY - minY) *
        Math.max(0, maxZ - minZ);
};
var contains = function (a, b) {
    return a.minX <= b.minX &&
        a.minY <= b.minY &&
        a.minZ <= b.minZ &&
        b.maxX <= a.maxX &&
        b.maxY <= a.maxY &&
        b.maxZ <= a.maxZ;
};
exports.intersects = function (a, b) {
    return b.minX <= a.maxX &&
        b.minY <= a.maxY &&
        b.minZ <= a.maxZ &&
        b.maxX >= a.minX &&
        b.maxY >= a.minY &&
        b.maxZ >= a.minZ;
};
exports.boxRayIntersects = function (box, ox, oy, oz, idx, idy, idz) {
    var tx0 = (box.minX - ox) * idx;
    var tx1 = (box.maxX - ox) * idx;
    var ty0 = (box.minY - oy) * idy;
    var ty1 = (box.maxY - oy) * idy;
    var tz0 = (box.minZ - oz) * idz;
    var tz1 = (box.maxZ - oz) * idz;
    var z0 = Math.min(tz0, tz1);
    var z1 = Math.max(tz0, tz1);
    var y0 = Math.min(ty0, ty1);
    var y1 = Math.max(ty0, ty1);
    var x0 = Math.min(tx0, tx1);
    var x1 = Math.max(tx0, tx1);
    var tmin = Math.max(0, x0, y0, z0);
    var tmax = Math.min(x1, y1, z1);
    return tmax >= tmin ? tmin : Infinity;
};
var multiSelect = function (arr, left, right, n, compare) {
    var stack = [left, right];
    var mid;
    while (stack.length) {
        right = stack.pop();
        left = stack.pop();
        if (right - left <= n)
            continue;
        mid = left + Math.ceil((right - left) / n / 2) * n;
        quickselect(arr, mid, left, right, compare);
        stack.push(left, mid, mid, right);
    }
};
var compareMinX = function (a, b) { return a.minX - b.minX; };
var compareMinY = function (a, b) { return a.minY - b.minY; };
var compareMinZ = function (a, b) { return a.minZ - b.minZ; };
var RBush3D = (function () {
    function RBush3D(maxEntries) {
        if (maxEntries === void 0) { maxEntries = 16; }
        this.maxEntries = Math.max(maxEntries, 8);
        this.minEntries = Math.max(4, Math.ceil(this.maxEntries * 0.4));
        this.clear();
    }
    RBush3D.alloc = function () {
        return this.pool.pop() || new this();
    };
    RBush3D.free = function (rbush) {
        rbush.clear();
        this.pool.push(rbush);
    };
    // Start of chipmunk
    RBush3D.prototype.searchCustom = function (customIntersects, customContains) {
        var node = this.data;
        var result = [];
        if (!customIntersects(node, isLeafChild(node, child)))
            return result;
        var nodesToSearch = [];
        while (node) {
            for (var i = 0, len = node.children.length; i < len; i++) {
                var child = node.children[i];
                if (customIntersects(child, isLeafChild(node, child))) {
                    if (isLeafChild(node, child))
                        result.push(child);
                    else if (customContains(child))
                        this._all(child, result);
                    else
                        nodesToSearch.push(child);
                }
            }
            node = nodesToSearch.pop();
        }
        return result;
    };
    RBush3D.prototype.analyzeTriangles = function (node) {
        if (node === undefined)
        {
            node = this.data;
        }

        var totalTriangles = 0;

        if (isLeaf(node))
        {
            for (var i = 0, len = node.children.length; i < len; i++) {
                totalTriangles += node.children [i].numTriangles;
            }
        }
        else
        {
            for (var i = 0, len = node.children.length; i < len; i++) {
                totalTriangles += this.analyzeTriangles (node.children [i]);
            }
        }

        return node.totalTriangles = totalTriangles;
    };
    RBush3D.prototype.groupNodesByNumTrianglesThreshold = function (numTrianglesThreshold, node)
    {
        if (node === undefined)
        {
            this.analyzeTriangles ();     
            node = this.data;
        }

        var totalTriangles = 0;

        var items = [];

        for (var i = 0, len = node.children.length; i < len; i++) {
            var child = node.children[i];
            items.push ({
                item: child,
                triangles: child.totalTriangles || child.numTriangles,
            });
        }

        items.sort (function (a, b) {
            return -(a.item.triangles - b.item.triangles);
        });

        var retVal = [];
        var retValItem = [];
        var retValItemTris = 0;

        var c = 0;

        for (var i = 0, len = items.length; i < len; i++) {
            var item = items[i];

            if ((retValItemTris + item.triangles) < numTrianglesThreshold)
            {
                retValItem.push (item);
                retValItemTris += item.triangles;
                continue;
            }

            if (retValItem.length)
            {
                retVal.push (retValItem);
                retValItem = [];
                retValItemTris = 0;
            }

            if ((retValItemTris + item.triangles) < numTrianglesThreshold)
            {
                i--;
                continue;
            }

            if (isLeafChild(node, item.item))
            {
                retVal.push ([
                    item,
                ]);
            }
            else
            {
                var tmp = this.groupNodesByNumTrianglesThreshold (
                    numTrianglesThreshold,
                    item.item
                );

                var tmp2 = [];
                var accum2 = 0;

                for (var j = 0, len2 = tmp.length; j < len2 - 1; j++)
                {
                    retVal.push (tmp [i]);
                }

                if (tmp.length > 1)
                {
                    tmp = tmp [tmp.length - 1];

                    for (var j = 0, len2 = tmp.length; j < len2; j++)
                    {
                        accum2 = accum2 + tmp [j].triangles;

                        if (accum2 < numTrianglesThreshold)
                        {
                            tmp2.push (tmp[j]);
                        }
                        else
                        {
                            if (accum2 == 0)
                            {
                                tmp2.push (tmp[j]);
                            }

                            retVal.push (tmp2);

                            accum2 = 0;
                            tmp2 = [];
                        }
                    }

                    tmp2.forEach (function (subItem) {
                        retValItem.push (subItem);
                        retValItemTris += subItem.triangles;
                    });
                }
            }
        }

        if (retValItem.length)
        {
            retVal.push (retValItem);
        }

        return retVal;
    }
    // End of chipmunk
    RBush3D.prototype.search = function (bbox) {
        var node = this.data;
        var result = [];
        if (!exports.intersects(bbox, node))
            return result;
        var nodesToSearch = [];
        while (node) {
            for (var i = 0, len = node.children.length; i < len; i++) {
                var child = node.children[i];
                if (exports.intersects(bbox, child)) {
                    if (isLeafChild(node, child))
                        result.push(child);
                    else if (contains(bbox, child))
                        this._all(child, result);
                    else
                        nodesToSearch.push(child);
                }
            }
            node = nodesToSearch.pop();
        }
        return result;
    };
    RBush3D.prototype.collides = function (bbox) {
        var node = this.data;
        if (!exports.intersects(bbox, node))
            return false;
        var nodesToSearch = [];
        while (node) {
            for (var i = 0, len = node.children.length; i < len; i++) {
                var child = node.children[i];
                if (exports.intersects(bbox, child)) {
                    if (isLeafChild(node, child) || contains(bbox, child))
                        return true;
                    nodesToSearch.push(child);
                }
            }
            node = nodesToSearch.pop();
        }
        return false;
    };
    RBush3D.prototype.raycastInv = function (ox, oy, oz, idx, idy, idz, maxLen) {
        if (maxLen === void 0) { maxLen = Infinity; }
        var node = this.data;
        if (idx === Infinity && idy === Infinity && idz === Infinity)
            return allowDistNode(Infinity, undefined);
        if (exports.boxRayIntersects(node, ox, oy, oz, idx, idy, idz) === Infinity)
            return allowDistNode(Infinity, undefined);
        var heap = [allowDistNode(0, node)];
        var swap = function (a, b) {
            var t = heap[a];
            heap[a] = heap[b];
            heap[b] = t;
        };
        var pop = function () {
            var top = heap[0];
            var newLen = heap.length - 1;
            heap[0] = heap[newLen];
            heap.length = newLen;
            var idx = 0;
            while (true) {
                var left = (idx << 1) | 1;
                if (left >= newLen)
                    break;
                var right = left + 1;
                if (right < newLen && heap[right].dist < heap[left].dist) {
                    left = right;
                }
                if (heap[idx].dist < heap[left].dist)
                    break;
                swap(idx, left);
                idx = left;
            }
            freeDistNode(top);
            return top.node;
        };
        var push = function (dist, node) {
            var idx = heap.length;
            heap.push(allowDistNode(dist, node));
            while (idx > 0) {
                var p = (idx - 1) >> 1;
                if (heap[p].dist <= heap[idx].dist)
                    break;
                swap(idx, p);
                idx = p;
            }
        };
        var dist = maxLen;
        var result;
        while (heap.length && heap[0].dist < dist) {
            node = pop();
            for (var i = 0, len = node.children.length; i < len; i++) {
                var child = node.children[i];
                var d = exports.boxRayIntersects(child, ox, oy, oz, idx, idy, idz);
                if (!isLeafChild(node, child)) {
                    push(d, child);
                }
                else if (d < dist) {
                    if (d === 0) {
                        return allowDistNode(d, child);
                    }
                    dist = d;
                    result = child;
                }
            }
        }
        return allowDistNode(dist < maxLen ? dist : Infinity, result);
    };
    RBush3D.prototype.raycast = function (ox, oy, oz, dx, dy, dz, maxLen) {
        if (maxLen === void 0) { maxLen = Infinity; }
        return this.raycastInv(ox, oy, oz, 1 / dx, 1 / dy, 1 / dz, maxLen);
    };
    RBush3D.prototype.all = function () {
        return this._all(this.data, []);
    };
    RBush3D.prototype.load = function (data) {
        if (!(data && data.length))
            return this;
        if (data.length < this.minEntries) {
            for (var i = 0, len = data.length; i < len; i++) {
                this.insert(data[i]);
            }
            return this;
        }
        var node = this.build(data.slice(), 0, data.length - 1, 0);
        if (!this.data.children.length) {
            this.data = node;
        }
        else if (this.data.height === node.height) {
            this.splitRoot(this.data, node);
        }
        else {
            if (this.data.height < node.height) {
                var tmpNode = this.data;
                this.data = node;
                node = tmpNode;
            }
            this._insert(node, this.data.height - node.height - 1, true);
        }
        return this;
    };
    RBush3D.prototype.insert = function (item) {
        if (item)
            this._insert(item, this.data.height - 1);
        return this;
    };
    RBush3D.prototype.clear = function () {
        if (this.data) {
            freeAllNode(this.data);
        }
        this.data = allowNode([]);
        return this;
    };
    RBush3D.prototype.remove = function (item, equalsFn) {
        if (!item)
            return this;
        var node = this.data;
        var i = 0;
        var goingUp = false;
        var index;
        var parent;
        var path = [];
        var indexes = [];
        while (node || path.length) {
            if (!node) {
                node = path.pop();
                i = indexes.pop();
                parent = path[path.length - 1];
                goingUp = true;
            }
            if (isLeaf(node)) {
                index = findItem(item, node.children, equalsFn);
                if (index !== -1) {
                    node.children.splice(index, 1);
                    path.push(node);
                    this.condense(path);
                    return this;
                }
            }
            if (!goingUp && !isLeaf(node) && contains(node, item)) {
                path.push(node);
                indexes.push(i);
                i = 0;
                parent = node;
                node = node.children[0];
            }
            else if (parent) {
                i++;
                node = parent.children[i];
                goingUp = false;
            }
            else {
                node = undefined;
            }
        }
        return this;
    };
    RBush3D.prototype.toJSON = function () {
        return this.data;
    };
    RBush3D.prototype.fromJSON = function (data) {
        freeAllNode(this.data);
        this.data = data;
        return this;
    };
    RBush3D.prototype.build = function (items, left, right, height) {
        var N = right - left + 1;
        var M = this.maxEntries;
        var node;
        if (N <= M) {
            node = allowNode(items.slice(left, right + 1));
            calcBBox(node);
            return node;
        }
        if (!height) {
            height = Math.ceil(Math.log(N) / Math.log(M));
            M = Math.ceil(N / Math.pow(M, height - 1));
        }
        node = allowNode([]);
        node.leaf = false;
        node.height = height;
        var N3 = Math.ceil(N / M), N2 = N3 * Math.ceil(Math.pow(M, 2 / 3)), N1 = N3 * Math.ceil(Math.pow(M, 1 / 3));
        multiSelect(items, left, right, N1, compareMinX);
        for (var i = left; i <= right; i += N1) {
            var right2 = Math.min(i + N1 - 1, right);
            multiSelect(items, i, right2, N2, compareMinY);
            for (var j = i; j <= right2; j += N2) {
                var right3 = Math.min(j + N2 - 1, right2);
                multiSelect(items, j, right3, N3, compareMinZ);
                for (var k = j; k <= right3; k += N3) {
                    var right4 = Math.min(k + N3 - 1, right3);
                    node.children.push(this.build(items, k, right4, height - 1));
                }
            }
        }
        calcBBox(node);
        return node;
    };
    RBush3D.prototype._all = function (node, result) {
        var nodesToSearch = [];
        while (node) {
            if (isLeaf(node))
                result.push.apply(result, node.children);
            else
                nodesToSearch.push.apply(nodesToSearch, node.children);
            node = nodesToSearch.pop();
        }
        return result;
    };
    RBush3D.prototype.chooseSubtree = function (bbox, node, level, path) {
        var minVolume;
        var minEnlargement;
        var targetNode;
        while (true) {
            path.push(node);
            if (isLeaf(node) || path.length - 1 === level)
                break;
            minVolume = minEnlargement = Infinity;
            for (var i = 0, len = node.children.length; i < len; i++) {
                var child = node.children[i];
                var volume = bboxVolume(child);
                var enlargement = enlargedVolume(bbox, child) - volume;
                if (enlargement < minEnlargement) {
                    minEnlargement = enlargement;
                    minVolume = volume < minVolume ? volume : minVolume;
                    targetNode = child;
                }
                else if (enlargement === minEnlargement) {
                    if (volume < minVolume) {
                        minVolume = volume;
                        targetNode = child;
                    }
                }
            }
            node = targetNode || node.children[0];
        }
        return node;
    };
    RBush3D.prototype.split = function (insertPath, level) {
        var node = insertPath[level];
        var M = node.children.length;
        var m = this.minEntries;
        this.chooseSplitAxis(node, m, M);
        var splitIndex = this.chooseSplitIndex(node, m, M);
        var newNode = allowNode(node.children.splice(splitIndex, node.children.length - splitIndex));
        newNode.height = node.height;
        newNode.leaf = node.leaf;
        calcBBox(node);
        calcBBox(newNode);
        if (level)
            insertPath[level - 1].children.push(newNode);
        else
            this.splitRoot(node, newNode);
    };
    RBush3D.prototype.splitRoot = function (node, newNode) {
        this.data = allowNode([node, newNode]);
        this.data.height = node.height + 1;
        this.data.leaf = false;
        calcBBox(this.data);
    };
    RBush3D.prototype.chooseSplitIndex = function (node, m, M) {
        var minOverlap = Infinity;
        var minVolume = Infinity;
        var index;
        for (var i = m; i <= M - m; i++) {
            var bbox1 = distBBox(node, 0, i);
            var bbox2 = distBBox(node, i, M);
            var overlap = intersectionVolume(bbox1, bbox2);
            var volume = bboxVolume(bbox1) + bboxVolume(bbox2);
            if (overlap < minOverlap) {
                minOverlap = overlap;
                index = i;
                minVolume = volume < minVolume ? volume : minVolume;
            }
            else if (overlap === minOverlap) {
                if (volume < minVolume) {
                    minVolume = volume;
                    index = i;
                }
            }
        }
        return index;
    };
    RBush3D.prototype.chooseSplitAxis = function (node, m, M) {
        var xMargin = this.allDistMargin(node, m, M, compareMinX);
        var yMargin = this.allDistMargin(node, m, M, compareMinY);
        var zMargin = this.allDistMargin(node, m, M, compareMinZ);
        if (xMargin < yMargin && xMargin < zMargin) {
            node.children.sort(compareMinX);
        }
        else if (yMargin < xMargin && yMargin < zMargin) {
            node.children.sort(compareMinY);
        }
    };
    RBush3D.prototype.allDistMargin = function (node, m, M, compare) {
        node.children.sort(compare);
        var leftBBox = distBBox(node, 0, m);
        var rightBBox = distBBox(node, M - m, M);
        var margin = bboxMargin(leftBBox) + bboxMargin(rightBBox);
        for (var i = m; i < M - m; i++) {
            var child = node.children[i];
            extend(leftBBox, child);
            margin += bboxMargin(leftBBox);
        }
        for (var i = M - m - 1; i >= m; i--) {
            var child = node.children[i];
            extend(rightBBox, child);
            margin += bboxMargin(rightBBox);
        }
        return margin;
    };
    RBush3D.prototype.adjustParentBBoxes = function (bbox, path, level) {
        for (var i = level; i >= 0; i--) {
            extend(path[i], bbox);
        }
    };
    RBush3D.prototype.condense = function (path) {
        for (var i = path.length - 1, siblings = void 0; i >= 0; i--) {
            if (path[i].children.length === 0) {
                if (i > 0) {
                    siblings = path[i - 1].children;
                    siblings.splice(siblings.indexOf(path[i]), 1);
                    freeNode(path[i]);
                }
                else {
                    this.clear();
                }
            }
            else {
                calcBBox(path[i]);
            }
        }
    };
    RBush3D.prototype._insert = function (item, level, isNode) {
        var insertPath = [];
        var node = this.chooseSubtree(item, this.data, level, insertPath);
        node.children.push(item);
        extend(node, item);
        while (level >= 0) {
            if (insertPath[level].children.length > this.maxEntries) {
                this.split(insertPath, level);
                level--;
            }
            else
                break;
        }
        this.adjustParentBBoxes(item, insertPath, level);
    };
    RBush3D.pool = [];
    return RBush3D;
}());
exports.RBush3D = RBush3D;

},{"quickselect":2}],2:[function(require,module,exports){
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.quickselect = factory());
}(this, (function () { 'use strict';

function quickselect(arr, k, left, right, compare) {
    quickselectStep(arr, k, left || 0, right || (arr.length - 1), compare || defaultCompare);
}

function quickselectStep(arr, k, left, right, compare) {

    while (right > left) {
        if (right - left > 600) {
            var n = right - left + 1;
            var m = k - left + 1;
            var z = Math.log(n);
            var s = 0.5 * Math.exp(2 * z / 3);
            var sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (m - n / 2 < 0 ? -1 : 1);
            var newLeft = Math.max(left, Math.floor(k - m * s / n + sd));
            var newRight = Math.min(right, Math.floor(k + (n - m) * s / n + sd));
            quickselectStep(arr, k, newLeft, newRight, compare);
        }

        var t = arr[k];
        var i = left;
        var j = right;

        swap(arr, left, k);
        if (compare(arr[right], t) > 0) swap(arr, left, right);

        while (i < j) {
            swap(arr, i, j);
            i++;
            j--;
            while (compare(arr[i], t) < 0) i++;
            while (compare(arr[j], t) > 0) j--;
        }

        if (compare(arr[left], t) === 0) swap(arr, left, j);
        else {
            j++;
            swap(arr, j, right);
        }

        if (j <= k) left = j + 1;
        if (k <= j) right = j - 1;
    }
}

function swap(arr, i, j) {
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
}

function defaultCompare(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

return quickselect;

})));

},{}]},{},[1])(1)
});

var tmp0 = module.exports.RBush3D;

export {tmp0 as RBush3D};

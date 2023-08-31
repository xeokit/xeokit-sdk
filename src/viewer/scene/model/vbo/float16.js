/**
 * Bundled by jsDelivr using Rollup v2.59.0 and Terser v5.9.0.
 * Original file: /npm/@petamoriken/float16@3.5.11/src/index.mjs
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
function t(t)
{
    return (r, ...e) => n(t, r, e)
}

function r(r, n)
{
    return t(s(r, n).get)
}
const
{
    apply: n,
    construct: e,
    defineProperty: o,
    get: i,
    getOwnPropertyDescriptor: s,
    getPrototypeOf: c,
    has: u,
    ownKeys: f,
    set: h,
    setPrototypeOf: l
} = Reflect, a = Proxy, y = Number,
{
    isFinite: p,
    isNaN: w
} = y,
{
    iterator: g,
    species: d,
    toStringTag: v,
    for: b
} = Symbol, A = Object,
{
    create: m,
    defineProperty: B,
    freeze: x,
    is: E
} = A, T = A.prototype, O = t(T.isPrototypeOf), j = A.hasOwn || t(T.hasOwnProperty), I = Array, P = I.isArray, S = I.prototype, _ = t(S.join), F = t(S.push), L = t(S.toLocaleString), R = S[g], C = t(R), N = Math.trunc, U = ArrayBuffer, M = U.isView, D = t(U.prototype.slice), k = r(U.prototype, "byteLength"), W = "undefined" != typeof SharedArrayBuffer ? SharedArrayBuffer : null, V = W && r(W.prototype, "byteLength"), Y = c(Uint8Array), z = Y.from, G = Y.prototype, K = G[g], X = t(G.keys), q = t(G.values), H = t(G.entries), J = t(G.set), Q = t(G.reverse), Z = t(G.fill), $ = t(G.copyWithin), tt = t(G.sort), rt = t(G.slice), nt = t(G.subarray), et = r(G, "buffer"), ot = r(G, "byteOffset"), it = r(G, "length"), st = r(G, v), ct = Uint16Array, ut = (...t) => n(z, ct, t), ft = Uint32Array, ht = Float32Array, lt = c([][g]()), at = t(lt.next), yt = t(function*() {}().next), pt = c(lt), wt = DataView.prototype, gt = t(wt.getUint16), dt = t(wt.setUint16), vt = TypeError, bt = RangeError, At = Set, mt = At.prototype, Bt = t(mt.add), xt = t(mt.has), Et = WeakMap, Tt = Et.prototype, Ot = t(Tt.get), jt = t(Tt.has), It = t(Tt.set), Pt = new U(4), St = new ht(Pt), _t = new ft(Pt), Ft = new ft(512), Lt = new ft(512);
for (let t = 0; t < 256; ++t)
{
    const r = t - 127;
    r < -27 ? (Ft[t] = 0, Ft[256 | t] = 32768, Lt[t] = 24, Lt[256 | t] = 24) : r < -14 ? (Ft[t] = 1024 >> -r - 14, Ft[256 | t] = 1024 >> -r - 14 | 32768, Lt[t] = -r - 1, Lt[256 | t] = -r - 1) : r <= 15 ? (Ft[t] = r + 15 << 10, Ft[256 | t] = r + 15 << 10 | 32768, Lt[t] = 13, Lt[256 | t] = 13) : r < 128 ? (Ft[t] = 31744, Ft[256 | t] = 64512, Lt[t] = 24, Lt[256 | t] = 24) : (Ft[t] = 31744, Ft[256 | t] = 64512, Lt[t] = 13, Lt[256 | t] = 13)
}

function Rt(t)
{
    St[0] = t;
    const r = _t[0],
        n = r >> 23 & 511;
    return Ft[n] + ((8388607 & r) >> Lt[n])
}
const Ct = new ft(2048),
    Nt = new ft(64),
    Ut = new ft(64);
Ct[0] = 0;
for (let t = 1; t < 1024; ++t)
{
    let r = t << 13,
        n = 0;
    for (; 0 == (8388608 & r);) n -= 8388608, r <<= 1;
    r &= -8388609, n += 947912704, Ct[t] = r | n
}
for (let t = 1024; t < 2048; ++t) Ct[t] = 939524096 + (t - 1024 << 13);
Nt[0] = 0;
for (let t = 1; t < 31; ++t) Nt[t] = t << 23;
Nt[31] = 1199570944, Nt[32] = 2147483648;
for (let t = 33; t < 63; ++t) Nt[t] = 2147483648 + (t - 32 << 23);
Nt[63] = 3347054592, Ut[0] = 0;
for (let t = 1; t < 64; ++t) Ut[t] = 32 === t ? 0 : 1024;

function Mt(t)
{
    const r = t >> 10;
    return _t[0] = Ct[Ut[r] + (1023 & t)] + Nt[r], St[0]
}

function Dt(t)
{
    if ("bigint" == typeof t) throw vt("Cannot convert a BigInt value to a number");
    if (t = y(t), !p(t) || 0 === t) return t;
    return Mt(Rt(t))
}

function kt(t)
{
    if (t[g] === R) return t;
    const r = C(t);
    return m(null,
    {
        next:
        {
            value: function()
            {
                return at(r)
            }
        },
        [g]:
        {
            value: function()
            {
                return this
            }
        }
    })
}
const Wt = new Et,
    Vt = m(pt,
    {
        next:
        {
            value: function()
            {
                const t = Ot(Wt, this);
                return yt(t)
            },
            writable: !0,
            configurable: !0
        },
        [v]:
        {
            value: "Array Iterator",
            configurable: !0
        }
    });

function Yt(t)
{
    const r = m(Vt);
    return It(Wt, r, t), r
}

function zt(t)
{
    return null !== t && "object" == typeof t || "function" == typeof t
}

function Gt(t)
{
    return null !== t && "object" == typeof t
}

function Kt(t)
{
    return void 0 !== st(t)
}

function Xt(t)
{
    const r = st(t);
    return "BigInt64Array" === r || "BigUint64Array" === r
}

function qt(t)
{
    if (null === W) return !1;
    try
    {
        return V(t), !0
    }
    catch (t)
    {
        return !1
    }
}

function Ht(t)
{
    if (!P(t)) return !1;
    if (t[g] === R) return !0;
    return "Array Iterator" === t[g]()[v]
}

function Jt(t)
{
    if ("string" != typeof t) return !1;
    const r = y(t);
    return t === r + "" && (!!p(r) && r === N(r))
}
const Qt = y.MAX_SAFE_INTEGER;

function Zt(t)
{
    if ("bigint" == typeof t) throw vt("Cannot convert a BigInt value to a number");
    const r = y(t);
    return w(r) || 0 === r ? 0 : N(r)
}

function $t(t)
{
    const r = Zt(t);
    return r < 0 ? 0 : r < Qt ? r : Qt
}

function tr(t, r)
{
    if (!zt(t)) throw vt("This is not an object");
    const n = t.constructor;
    if (void 0 === n) return r;
    if (!zt(n)) throw vt("The constructor property value is not an object");
    const e = n[d];
    return null == e ? r : e
}

function rr(t)
{
    if (qt(t)) return !1;
    try
    {
        return D(t, 0, 0), !1
    }
    catch (t)
    {}
    return !0
}

function nr(t, r)
{
    const n = w(t),
        e = w(r);
    if (n && e) return 0;
    if (n) return 1;
    if (e) return -1;
    if (t < r) return -1;
    if (t > r) return 1;
    if (0 === t && 0 === r)
    {
        const n = E(t, 0),
            e = E(r, 0);
        if (!n && e) return -1;
        if (n && !e) return 1
    }
    return 0
}
const er = b("__Float16Array__"),
    or = new Et;

function ir(t)
{
    return jt(or, t) || !M(t) && function(t)
    {
        if (!Gt(t)) return !1;
        const r = c(t);
        if (!Gt(r)) return !1;
        const n = r.constructor;
        if (void 0 === n) return !1;
        if (!zt(n)) throw vt("The constructor property value is not an object");
        return u(n, er)
    }(t)
}

function sr(t)
{
    if (!ir(t)) throw vt("This is not a Float16Array object")
}

function cr(t, r)
{
    const n = ir(t),
        e = Kt(t);
    if (!n && !e) throw vt("Species constructor didn't return TypedArray object");
    if ("number" == typeof r)
    {
        let e;
        if (n)
        {
            const r = ur(t);
            e = it(r)
        }
        else e = it(t);
        if (e < r) throw vt("Derived constructor created TypedArray object which was too small length")
    }
    if (Xt(t)) throw vt("Cannot mix BigInt and other types, use explicit conversions")
}

function ur(t)
{
    const r = Ot(or, t);
    if (void 0 !== r)
    {
        if (rr(et(r))) throw vt("Attempting to access detached ArrayBuffer");
        return r
    }
    const n = t.buffer;
    if (rr(n)) throw vt("Attempting to access detached ArrayBuffer");
    const o = e(ar, [n, t.byteOffset, t.length], t.constructor);
    return Ot(or, o)
}

function fr(t)
{
    const r = it(t),
        n = [];
    for (let e = 0; e < r; ++e) n[e] = Mt(t[e]);
    return n
}
const hr = new At;
for (const t of f(G))
{
    if (t === v) continue;
    const r = s(G, t);
    j(r, "get") && Bt(hr, t)
}
const lr = x(
{
    get: (t, r, n) => Jt(r) && j(t, r) ? Mt(i(t, r)) : xt(hr, r) && O(G, t) ? i(t, r) : i(t, r, n),
    set: (t, r, n, e) => Jt(r) && j(t, r) ? h(t, r, Rt(n)) : h(t, r, n, e),
    getOwnPropertyDescriptor(t, r)
    {
        if (Jt(r) && j(t, r))
        {
            const n = s(t, r);
            return n.value = Mt(n.value), n
        }
        return s(t, r)
    },
    defineProperty: (t, r, n) => Jt(r) && j(t, r) && j(n, "value") ? (n.value = Rt(n.value), o(t, r, n)) : o(t, r, n)
});
class ar
{
    constructor(t, r, n)
    {
        let o;
        if (ir(t)) o = e(ct, [ur(t)], new.target);
        else if (zt(t) && ! function(t)
            {
                try
                {
                    return k(t), !0
                }
                catch (t)
                {
                    return !1
                }
            }(t))
        {
            let r, n;
            if (Kt(t))
            {
                r = t, n = it(t);
                const i = et(t),
                    s = qt(i) ? U : tr(i, U);
                if (rr(i)) throw vt("Attempting to access detached ArrayBuffer");
                if (Xt(t)) throw vt("Cannot mix BigInt and other types, use explicit conversions");
                const c = new s(2 * n);
                o = e(ct, [c], new.target)
            }
            else
            {
                const i = t[g];
                if (null != i && "function" != typeof i) throw vt("@@iterator property is not callable");
                null != i ? Ht(t) ? (r = t, n = t.length) : (r = [...t], n = r.length) : (r = t, n = $t(r.length)), o = e(ct, [n], new.target)
            }
            for (let t = 0; t < n; ++t) o[t] = Rt(r[t])
        }
        else o = e(ct, arguments, new.target);
        const i = new a(o, lr);
        return It(or, i, o), i
    }
    static from(t, ...r)
    {
        const e = this;
        if (!u(e, er)) throw vt("This constructor is not a subclass of Float16Array");
        if (e === ar)
        {
            if (ir(t) && 0 === r.length)
            {
                const r = ur(t),
                    n = new ct(et(r), ot(r), it(r));
                return new ar(et(rt(n)))
            }
            if (0 === r.length) return new ar(et(ut(t, Rt)));
            const e = r[0],
                o = r[1];
            return new ar(et(ut(t, (function(t, ...r)
            {
                return Rt(n(e, this, [t, ...kt(r)]))
            }), o)))
        }
        let o, i;
        const s = t[g];
        if (null != s && "function" != typeof s) throw vt("@@iterator property is not callable");
        if (null != s) Ht(t) ? (o = t, i = t.length) : !Kt(c = t) || c[g] !== K && "Array Iterator" !== c[g]()[v] ? (o = [...t], i = o.length) : (o = t, i = it(t));
        else
        {
            if (null == t) throw vt("Cannot convert undefined or null to object");
            o = A(t), i = $t(o.length)
        }
        var c;
        const f = new e(i);
        if (0 === r.length)
            for (let t = 0; t < i; ++t) f[t] = o[t];
        else
        {
            const t = r[0],
                e = r[1];
            for (let r = 0; r < i; ++r) f[r] = n(t, e, [o[r], r])
        }
        return f
    }
    static of(...t)
    {
        const r = this;
        if (!u(r, er)) throw vt("This constructor is not a subclass of Float16Array");
        const n = t.length;
        if (r === ar)
        {
            const r = new ar(n),
                e = ur(r);
            for (let r = 0; r < n; ++r) e[r] = Rt(t[r]);
            return r
        }
        const e = new r(n);
        for (let r = 0; r < n; ++r) e[r] = t[r];
        return e
    }
    keys()
    {
        sr(this);
        const t = ur(this);
        return X(t)
    }
    values()
    {
        sr(this);
        const t = ur(this);
        return Yt(function*()
        {
            for (const r of q(t)) yield Mt(r)
        }())
    }
    entries()
    {
        sr(this);
        const t = ur(this);
        return Yt(function*()
        {
            for (const [r, n] of H(t)) yield [r, Mt(n)]
        }())
    }
    at(t)
    {
        sr(this);
        const r = ur(this),
            n = it(r),
            e = Zt(t),
            o = e >= 0 ? e : n + e;
        if (!(o < 0 || o >= n)) return Mt(r[o])
    }
    map(t, ...r)
    {
        sr(this);
        const e = ur(this),
            o = it(e),
            i = r[0],
            s = tr(e, ar);
        if (s === ar)
        {
            const r = new ar(o),
                s = ur(r);
            for (let r = 0; r < o; ++r)
            {
                const o = Mt(e[r]);
                s[r] = Rt(n(t, i, [o, r, this]))
            }
            return r
        }
        const c = new s(o);
        cr(c, o);
        for (let r = 0; r < o; ++r)
        {
            const o = Mt(e[r]);
            c[r] = n(t, i, [o, r, this])
        }
        return c
    }
    filter(t, ...r)
    {
        sr(this);
        const e = ur(this),
            o = it(e),
            i = r[0],
            s = [];
        for (let r = 0; r < o; ++r)
        {
            const o = Mt(e[r]);
            n(t, i, [o, r, this]) && F(s, o)
        }
        const c = new(tr(e, ar))(s);
        return cr(c), c
    }
    reduce(t, ...r)
    {
        sr(this);
        const n = ur(this),
            e = it(n);
        if (0 === e && 0 === r.length) throw vt("Reduce of empty array with no initial value");
        let o, i;
        0 === r.length ? (o = Mt(n[0]), i = 1) : (o = r[0], i = 0);
        for (let r = i; r < e; ++r) o = t(o, Mt(n[r]), r, this);
        return o
    }
    reduceRight(t, ...r)
    {
        sr(this);
        const n = ur(this),
            e = it(n);
        if (0 === e && 0 === r.length) throw vt("Reduce of empty array with no initial value");
        let o, i;
        0 === r.length ? (o = Mt(n[e - 1]), i = e - 2) : (o = r[0], i = e - 1);
        for (let r = i; r >= 0; --r) o = t(o, Mt(n[r]), r, this);
        return o
    }
    forEach(t, ...r)
    {
        sr(this);
        const e = ur(this),
            o = it(e),
            i = r[0];
        for (let r = 0; r < o; ++r) n(t, i, [Mt(e[r]), r, this])
    }
    find(t, ...r)
    {
        sr(this);
        const e = ur(this),
            o = it(e),
            i = r[0];
        for (let r = 0; r < o; ++r)
        {
            const o = Mt(e[r]);
            if (n(t, i, [o, r, this])) return o
        }
    }
    findIndex(t, ...r)
    {
        sr(this);
        const e = ur(this),
            o = it(e),
            i = r[0];
        for (let r = 0; r < o; ++r)
        {
            const o = Mt(e[r]);
            if (n(t, i, [o, r, this])) return r
        }
        return -1
    }
    findLast(t, ...r)
    {
        sr(this);
        const e = ur(this),
            o = it(e),
            i = r[0];
        for (let r = o - 1; r >= 0; --r)
        {
            const o = Mt(e[r]);
            if (n(t, i, [o, r, this])) return o
        }
    }
    findLastIndex(t, ...r)
    {
        sr(this);
        const e = ur(this),
            o = it(e),
            i = r[0];
        for (let r = o - 1; r >= 0; --r)
        {
            const o = Mt(e[r]);
            if (n(t, i, [o, r, this])) return r
        }
        return -1
    }
    every(t, ...r)
    {
        sr(this);
        const e = ur(this),
            o = it(e),
            i = r[0];
        for (let r = 0; r < o; ++r)
            if (!n(t, i, [Mt(e[r]), r, this])) return !1;
        return !0
    }
    some(t, ...r)
    {
        sr(this);
        const e = ur(this),
            o = it(e),
            i = r[0];
        for (let r = 0; r < o; ++r)
            if (n(t, i, [Mt(e[r]), r, this])) return !0;
        return !1
    }
    set(t, ...r)
    {
        sr(this);
        const n = ur(this),
            e = Zt(r[0]);
        if (e < 0) throw bt("Offset is out of bounds");
        if (null == t) throw vt("Cannot convert undefined or null to object");
        if (Xt(t)) throw vt("Cannot mix BigInt and other types, use explicit conversions");
        if (ir(t)) return J(ur(this), ur(t), e);
        if (Kt(t))
        {
            if (rr(et(t))) throw vt("Attempting to access detached ArrayBuffer")
        }
        const o = it(n),
            i = A(t),
            s = $t(i.length);
        if (e === 1 / 0 || s + e > o) throw bt("Offset is out of bounds");
        for (let t = 0; t < s; ++t) n[t + e] = Rt(i[t])
    }
    reverse()
    {
        sr(this);
        const t = ur(this);
        return Q(t), this
    }
    fill(t, ...r)
    {
        sr(this);
        const n = ur(this);
        return Z(n, Rt(t), ...kt(r)), this
    }
    copyWithin(t, r, ...n)
    {
        sr(this);
        const e = ur(this);
        return $(e, t, r, ...kt(n)), this
    }
    sort(...t)
    {
        sr(this);
        const r = ur(this),
            n = void 0 !== t[0] ? t[0] : nr;
        return tt(r, ((t, r) => n(Mt(t), Mt(r)))), this
    }
    slice(...t)
    {
        sr(this);
        const r = ur(this),
            n = tr(r, ar);
        if (n === ar)
        {
            const n = new ct(et(r), ot(r), it(r));
            return new ar(et(rt(n, ...kt(t))))
        }
        const e = it(r),
            o = Zt(t[0]),
            i = void 0 === t[1] ? e : Zt(t[1]);
        let s, c;
        s = o === -1 / 0 ? 0 : o < 0 ? e + o > 0 ? e + o : 0 : e < o ? e : o, c = i === -1 / 0 ? 0 : i < 0 ? e + i > 0 ? e + i : 0 : e < i ? e : i;
        const u = c - s > 0 ? c - s : 0,
            f = new n(u);
        if (cr(f, u), 0 === u) return f;
        if (rr(et(r))) throw vt("Attempting to access detached ArrayBuffer");
        let h = 0;
        for (; s < c;) f[h] = Mt(r[s]), ++s, ++h;
        return f
    }
    subarray(...t)
    {
        sr(this);
        const r = ur(this),
            n = tr(r, ar),
            e = new ct(et(r), ot(r), it(r)),
            o = nt(e, ...kt(t)),
            i = new n(et(o), ot(o), it(o));
        return cr(i), i
    }
    indexOf(t, ...r)
    {
        sr(this);
        const n = ur(this),
            e = it(n);
        let o = Zt(r[0]);
        if (o === 1 / 0) return -1;
        o < 0 && (o += e, o < 0 && (o = 0));
        for (let r = o; r < e; ++r)
            if (j(n, r) && Mt(n[r]) === t) return r;
        return -1
    }
    lastIndexOf(t, ...r)
    {
        sr(this);
        const n = ur(this),
            e = it(n);
        let o = r.length >= 1 ? Zt(r[0]) : e - 1;
        if (o === -1 / 0) return -1;
        o >= 0 ? o = o < e - 1 ? o : e - 1 : o += e;
        for (let r = o; r >= 0; --r)
            if (j(n, r) && Mt(n[r]) === t) return r;
        return -1
    }
    includes(t, ...r)
    {
        sr(this);
        const n = ur(this),
            e = it(n);
        let o = Zt(r[0]);
        if (o === 1 / 0) return !1;
        o < 0 && (o += e, o < 0 && (o = 0));
        const i = w(t);
        for (let r = o; r < e; ++r)
        {
            const e = Mt(n[r]);
            if (i && w(e)) return !0;
            if (e === t) return !0
        }
        return !1
    }
    join(...t)
    {
        sr(this);
        const r = fr(ur(this));
        return _(r, ...kt(t))
    }
    toLocaleString(...t)
    {
        sr(this);
        const r = fr(ur(this));
        return L(r, ...kt(t))
    }
    get[v]()
    {
        if (ir(this)) return "Float16Array"
    }
}
B(ar, "BYTES_PER_ELEMENT",
{
    value: 2
}), B(ar, er,
{}), l(ar, Y);
const yr = ar.prototype;

function pr(t, r, ...n)
{
    return Mt(gt(t, r, ...kt(n)))
}

function wr(t, r, n, ...e)
{
    return dt(t, r, Rt(n), ...kt(e))
}
B(yr, "BYTES_PER_ELEMENT",
{
    value: 2
}), B(yr, g,
{
    value: yr.values,
    writable: !0,
    configurable: !0
}), l(yr, G);
export
{
    ar as Float16Array, pr as getFloat16, Dt as hfround, ir as isFloat16Array, wr as setFloat16
};
/*jshint globalstrict:true*/
/**
 * Copyright 2013 Andy Earnshaw, MIT License
 *
 * Defines, and assigns to, variables available to all Intl.js functions
 */
"use strict";

var
    // We use this a lot (and need it for proto-less objects)
    hop = Object.prototype.hasOwnProperty,

    // Naive defineProperty for compatibility
    defineProperty = Object.defineProperty || function (obj, name, desc) {
        if (desc.get && obj.__defineGetter__)
            obj.__defineGetter(name, desc.get);
        else if (desc.value || desc.get)
            obj[name] = desc.value || desc.get;
    },

    // Array.prototype.indexOf, as good as we need it to be
    arrIndexOf = Array.prototype.indexOf || function (search) {
        /*jshint validthis:true */
        var t = this;
        if (!t.length)
            return -1;

        for (var i = arguments[1] || 0, max = t.length; i < max; i++) {
            if (t[i] === search)
                return i;
        }
    },

    // Create an object with the specified prototype (2nd arg required for Record)
    objCreate = Object.create || function (proto, props) {
        var obj;

        function F() {}
        F.prototype = proto;
        obj = new F();

        for (var k in props) {
            if (hop.call(props, k))
                defineProperty(obj, k, props[k]);
        }

        return obj;
    },

    // Snapshot some (hopefully still) native built-ins
    arrSlice  = Array.prototype.slice,
    arrConcat = Array.prototype.concat,
    arrPush   = Array.prototype.push,
    arrJoin   = Array.prototype.join,
    arrShift  = Array.prototype.shift,

    // Naive Function.prototype.bind for compatibility
    fnBind = Function.prototype.bind || function (thisObj) {
        var fn = this,
            args = arrSlice.call(arguments, 1);

        return function () {
            return fn.apply(thisObj, arrConcat.call(args, arrSlice.call(arguments)));
        };
    },

    // Default locale is the first-added locale data for us
    defaultLocale,

    // Object housing internal properties for constructors
    internals = objCreate(null),

    // Keep internal properties internal
    secret = Math.random(),

    // Each constructor prototype should be an instance of the constructor itself, but we
    // can't initialise them as such until some locale data has been added, so this is how
    // we keep track
    numberFormatProtoInitialised = false,
    dateTimeFormatProtoInitialised = false,

    // Currency minor units output from tools/getISO4217data.js, formatted
    currencyMinorUnits = {
        BHD: 3, BYR: 0, XOF: 0, BIF: 0, XAF: 0, CLF: 0, CLP: 0, KMF: 0, DJF: 0,
        XPF: 0, GNF: 0, ISK: 0, IQD: 3, JPY: 0, JOD: 3, KRW: 0, KWD: 3, LYD: 3,
        OMR: 3, PYG: 0, RWF: 0, TND: 3, UGX: 0, UYI: 0, VUV: 0, VND: 0
    };

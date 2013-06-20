/**
 * Copyright 2013 Andy Earnshaw, MIT License
 *
 * Implements the ECMA-402 specification functions for formatting dates
 */

var
    // An object map of date component keys, saves using a regex later
    dateWidths = objCreate(null, { narrow:{}, short:{}, long:{} });

// 12.1 The Intl.DateTimeFormat constructor
// ==================================

// Define the DateTimeFormat constructor internally so it cannot be tainted
function DateTimeFormatConstructor () {
    var locales = arguments[0];
    var options = arguments[1];

    if (!this || this === Intl) {
        return new Intl.DateTimeFormat(locales, options);
    }
    return InitializeDateTimeFormat(toObject(this), locales, options);
}

defineProperty(Intl, 'DateTimeFormat', {
    configurable: true,
    writable: true,
    value: DateTimeFormatConstructor
});

// Must explicitly set prototypes as unwritable
defineProperty(DateTimeFormatConstructor, 'prototype', {
    writable: false
});

/**
 * The abstract operation InitializeDateTimeFormat accepts the arguments dateTimeFormat
 * (which must be an object), locales, and options. It initializes dateTimeFormat as a
 * DateTimeFormat object.
 */
function/* 12.1.1.1 */InitializeDateTimeFormat (dateTimeFormat, locales, options) {
    var
    // This will be a internal properties object if we're not already initialized
        internal = getInternalProperties(dateTimeFormat),

    // Create an object whose props can be used to restore the values of RegExp props
        regexpState = createRegExpRestore();

    // 1. If dateTimeFormat has an [[initializedIntlObject]] internal property with
    //    value true, throw a TypeError exception.
    if (internal['[[initializedIntlObject]]'] === true)
        throw new TypeError('`this` object has already been initialized as an Intl object');

    // Need this to access the `internal` object
    defineProperty(dateTimeFormat, '__getInternalProperties', {
        value: function () {
            // NOTE: Non-standard, for internal use only
            if (arguments[0] === secret)
                return internal;
        }
    });

    // 2. Set the [[initializedIntlObject]] internal property of numberFormat to true.
    internal['[[initializedIntlObject]]'] = true;

    var
    // 3. Let requestedLocales be the result of calling the CanonicalizeLocaleList
    //    abstract operation (defined in 9.2.1) with argument locales.
        requestedLocales = CanonicalizeLocaleList(locales),

    // 4. Let options be the result of calling the ToDateTimeOptions abstract
    //    operation (defined below) with arguments options, "any", and "date".
        options = ToDateTimeOptions(options, 'any', 'date'),

    // 5. Let opt be a new Record.
        opt = new Record();

    // 6. Let matcher be the result of calling the GetOption abstract operation
    //    (defined in 9.2.9) with arguments options, "localeMatcher", "string", a List
    //    containing the two String values "lookup" and "best fit", and "best fit".
        matcher = GetOption(options, 'localeMatcher', 'string', new List('lookup', 'best fit'), 'best fit');

    // 7. Set opt.[[localeMatcher]] to matcher.
    opt['[[localeMatcher]]'] = matcher;

    var
    // 8. Let DateTimeFormat be the standard built-in object that is the initial
    //    value of Intl.DateTimeFormat.
        DateTimeFormat = internals.DateTimeFormat, // This is what we *really* need

    // 9. Let localeData be the value of the [[localeData]] internal property of
    //    DateTimeFormat.
        localeData = DateTimeFormat['[[localeData]]'],

    // 10. Let r be the result of calling the ResolveLocale abstract operation
    //     (defined in 9.2.5) with the [[availableLocales]] internal property of
    //      DateTimeFormat, requestedLocales, opt, the [[relevantExtensionKeys]]
    //      internal property of DateTimeFormat, and localeData.
        r = ResolveLocale(DateTimeFormat['[[availableLocales]]'], requestedLocales,
                opt, DateTimeFormat['[[relevantExtensionKeys]]'], localeData);

    // 11. Set the [[locale]] internal property of dateTimeFormat to the value of
    //     r.[[locale]].
    internal['[[locale]]'] = r['[[locale]]'];

    // 12. Set the [[calendar]] internal property of dateTimeFormat to the value of
    //     r.[[ca]].
    internal['[[calendar]]'] = r['[[ca]]'];

    // 13. Set the [[numberingSystem]] internal property of dateTimeFormat to the value of
    //     r.[[nu]].
    internal['[[numberingSystem]]'] = r['[[nu]]'];

    // The specification doesn't tell us to do this, but it's helpful later on
    internal['[[dataLocale]]'] = r['[[dataLocale]]'];

    var
    // 14. Let dataLocale be the value of r.[[dataLocale]].
        dataLocale = r['[[dataLocale]]'],

    // 15. Let tz be the result of calling the [[Get]] internal method of options with
    //     argument "timeZone".
        tz = options.timeZone;

    // 16. If tz is not undefined, then
    if (tz !== undefined) {
        // a. Let tz be ToString(tz).
        // b. Convert tz to upper case as described in 6.1.
        //    NOTE: If an implementation accepts additional time zone values, as permitted
        //          under certain conditions by the Conformance clause, different casing
        //          rules apply.
        tz = toLatinUpperCase(tz);

        // c. If tz is not "UTC", then throw a RangeError exception.
        // ###TODO: accept more time zones###
        if (tz !== 'UTC')
            throw new RangeError('timeZone is not supported.');
    }

    // 17. Set the [[timeZone]] internal property of dateTimeFormat to tz.
    internal['[[timeZone]]'] = tz;

    // 18. Let opt be a new Record.
    opt = new Record();

    // 19. For each row of Table 3, except the header row, do:
    for (var prop in dateTimeComponents) {
        if (!hop.call(dateTimeComponents, prop))
            continue;

        var
        // 20. Let prop be the name given in the Property column of the row.
        // 21. Let value be the result of calling the GetOption abstract operation,
        //     passing as argument options, the name given in the Property column of the
        //     row, "string", a List containing the strings given in the Values column of
        //     the row, and undefined.
            value = GetOption(options, prop, 'string', dateTimeComponents[prop]);

        // 22. Set opt.[[<prop>]] to value.
        opt['[['+prop+']]'] = value;
    }

    var
        // Assigned a value below
        bestFormat,

        // 23. Let dataLocaleData be the result of calling the [[Get]] internal method of
        //     localeData with argument dataLocale.
        dataLocaleData = localeData[dataLocale],

        // 24. Let formats be the result of calling the [[Get]] internal method of
        //     dataLocaleData with argument "formats".
        formats = dataLocaleData.formats,
        // 25. Let matcher be the result of calling the GetOption abstract operation with
        //     arguments options, "formatMatcher", "string", a List containing the two String
        //     values "basic" and "best fit", and "best fit".
        matcher = GetOption(options, 'formatMatcher', 'string', new List('basic', 'best fit'), 'best fit');

    // 26. If matcher is "basic", then
    if (matcher === 'basic')
        // 27. Let bestFormat be the result of calling the BasicFormatMatcher abstract
        //     operation (defined below) with opt and formats.
        bestFormat = BasicFormatMatcher(opt, formats);

    // 28. Else
    else
        // 29. Let bestFormat be the result of calling the BestFitFormatMatcher
        //     abstract operation (defined below) with opt and formats.
        bestFormat = BestFitFormatMatcher(opt, formats);

    // 30. For each row in Table 3, except the header row, do
    for (var prop in dateTimeComponents) {
        if (!hop.call(dateTimeComponents, prop))
            continue;

        // a. Let prop be the name given in the Property column of the row.
        // b. Let pDesc be the result of calling the [[GetOwnProperty]] internal method of
        //    bestFormat with argument prop.
        // c. If pDesc is not undefined, then
        if (hop.call(bestFormat, prop)) {
            var
            // i. Let p be the result of calling the [[Get]] internal method of bestFormat
            //    with argument prop.
                p = bestFormat[prop];

            // ii. Set the [[<prop>]] internal property of dateTimeFormat to p.
            internal['[['+prop+']]'] = p;
        }
    }

    var
        // Assigned a value below
        pattern,

    // 31. Let hr12 be the result of calling the GetOption abstract operation with
    //     arguments options, "hour12", "boolean", undefined, and undefined.
        hr12 = GetOption(options, 'hour12', 'boolean'/*, undefined, undefined*/);

    // 32. If dateTimeFormat has an internal property [[hour]], then
    if (internal['[[hour]]']) {
        // a. If hr12 is undefined, then let hr12 be the result of calling the [[Get]]
        //    internal method of dataLocaleData with argument "hour12".
        hr12 = hr12 === undefined ? dataLocaleData.hour12 : hr12;

        // b. Set the [[hour12]] internal property of dateTimeFormat to hr12.
        internal['[[hour12]]'] = hr12;

        // c. If hr12 is true, then
        if (hr12 === true) {
            var
            // i. Let hourNo0 be the result of calling the [[Get]] internal method of
            //    dataLocaleData with argument "hourNo0".
                hourNo0 = dataLocaleData.hourNo0;

            // ii. Set the [[hourNo0]] internal property of dateTimeFormat to hourNo0.
            internal['[[hourNo0]]'] = hourNo0;

            // iii. Let pattern be the result of calling the [[Get]] internal method of
            //      bestFormat with argument "pattern12".
            pattern = bestFormat.pattern12;
        }

        // d. Else
        else
            // i. Let pattern be the result of calling the [[Get]] internal method of
            //    bestFormat with argument "pattern".
            pattern = bestFormat.pattern;
    }

    // 33. Else
    else
        // a. Let pattern be the result of calling the [[Get]] internal method of
        //    bestFormat with argument "pattern".
        pattern = bestFormat.pattern;

    // 34. Set the [[pattern]] internal property of dateTimeFormat to pattern.
    internal['[[pattern]]'] = pattern;

    // 35. Set the [[boundFormat]] internal property of dateTimeFormat to undefined.
    internal['[[boundFormat]]'] = undefined;

    // 36. Set the [[initializedDateTimeFormat]] internal property of dateTimeFormat to
    //     true.
    internal['[[initializedDateTimeFormat]]'] = true;

    // Restore the RegExp properties
    regexpState.exp.test(regexpState.input);

    // Return the newly initialised object
    return dateTimeFormat;
}

/**
 * Several DateTimeFormat algorithms use values from the following table, which provides
 * property names and allowable values for the components of date and time formats:
 */
var dateTimeComponents = {
         weekday: [ "narrow", "short", "long" ],
             era: [ "narrow", "short", "long" ],
            year: [ "2-digit", "numeric" ],
           month: [ "2-digit", "numeric", "narrow", "short", "long" ],
             day: [ "2-digit", "numeric" ],
            hour: [ "2-digit", "numeric" ],
          minute: [ "2-digit", "numeric" ],
          second: [ "2-digit", "numeric" ],
    timeZoneName: [ "short", "long" ]
};

/**
 * When the ToDateTimeOptions abstract operation is called with arguments options,
 * required, and defaults, the following steps are taken:
 */
function ToDateTimeOptions (options, required, defaults) {
    // 1. If options is undefined, then let options be null, else let options be
    //    ToObject(options).
    options = options === undefined ? null : new Record(toObject(options));

    var
    // 2. Let create be the standard built-in function object defined in ES5, 15.2.3.5.
        create = objCreate,

    // 3. Let options be the result of calling the [[Call]] internal method of create with
    //    undefined as the this value and an argument list containing the single item
    //    options.
        options = create(options),

    // 4. Let needDefaults be true.
        needDefaults = true;

    // 5. If required is "date" or "any", then
    if (required === 'date' || required === 'any') {
        // a. For each of the property names "weekday", "year", "month", "day":
            // i. If the result of calling the [[Get]] internal method of options with the
            //    property name is not undefined, then let needDefaults be false.
        if (options.weekday !== undefined || options.year !== undefined
                || options.month !== undefined || options.day !== undefined)
            needDefaults = false;
    }

    // 6. If required is "time" or "any", then
    if (required === 'time' || required === 'any') {
        // a. For each of the property names "hour", "minute", "second":
            // i. If the result of calling the [[Get]] internal method of options with the
            //    property name is not undefined, then let needDefaults be false.
        if (options.hour !== undefined || options.minute !== undefined || options.second !== undefined)
                needDefaults = false;
    }

    // 7. If needDefaults is true and defaults is either "date" or "all", then
    if (needDefaults && (defaults === 'date' || defaults === 'all'))
        // a. For each of the property names "year", "month", "day":
            // i. Call the [[DefineOwnProperty]] internal method of options with the
            //    property name, Property Descriptor {[[Value]]: "numeric", [[Writable]]:
            //    true, [[Enumerable]]: true, [[Configurable]]: true}, and false.
        options.year = options.month = options.day = 'numeric';

    // 8. If needDefaults is true and defaults is either "time" or "all", then
    if (needDefaults && (defaults === 'time' || defaults === 'all'))
        // a. For each of the property names "hour", "minute", "second":
            // i. Call the [[DefineOwnProperty]] internal method of options with the
            //    property name, Property Descriptor {[[Value]]: "numeric", [[Writable]]:
            //    true, [[Enumerable]]: true, [[Configurable]]: true}, and false.
        options.hour = options.minute = options.second = 'numeric';

    // 9. Return options.
    return options;
}

/**
 * When the BasicFormatMatcher abstract operation is called with two arguments options and
 * formats, the following steps are taken:
 */
function BasicFormatMatcher (options, formats) {
    var
    // 1. Let removalPenalty be 120.
        removalPenalty = 120,

    // 2. Let additionPenalty be 20.
        additionPenalty = 20,

    // 3. Let longLessPenalty be 8.
        longLessPenalty = 8,

    // 4. Let longMorePenalty be 6.
        longMorePenalty = 6,

    // 5. Let shortLessPenalty be 6.
        shortLessPenalty = 6,

    // 6. Let shortMorePenalty be 3.
        shortMorePenalty = 3,

    // 7. Let bestScore be -Infinity.
        bestScore = -Infinity,

    // 8. Let bestFormat be undefined.
        bestFormat,

    // 9. Let i be 0.
        i = 0,

    // 10. Let len be the result of calling the [[Get]] internal method of formats with argument "length".
        len = formats.length;

    // 11. Repeat while i < len:
    while (i < len) {
        var
        // a. Let format be the result of calling the [[Get]] internal method of formats with argument ToString(i).
            format = formats[i],

        // b. Let score be 0.
            score = 0;

        // c. For each property shown in Table 3:
        for (var property in dateTimeComponents) {
            if (!hop.call(dateTimeComponents, property))
                continue;

            var
            // i. Let optionsProp be options.[[<property>]].
                optionsProp = options['[['+ property +']]'],

            // ii. Let formatPropDesc be the result of calling the [[GetOwnProperty]] internal method of format
            //     with argument property.
            // iii. If formatPropDesc is not undefined, then
                // 1. Let formatProp be the result of calling the [[Get]] internal method of format with argument property.
                formatProp = hop.call(format, property) ? format[property] : undefined;

            // iv. If optionsProp is undefined and formatProp is not undefined, then decrease score by
            //     additionPenalty.
            if (optionsProp === undefined && formatProp !== undefined)
                score -= additionPenalty;

            // v. Else if optionsProp is not undefined and formatProp is undefined, then decrease score by
            //    removalPenalty.
            else if (optionsProp !== undefined && formatProp === undefined)
                score -= removalPenalty;

            // vi. Else
            else {
                var
                // 1. Let values be the array ["2-digit", "numeric", "narrow", "short",
                //    "long"].
                    values = [ '2-digit', 'numeric', 'narrow', 'short', 'long' ],

                // 2. Let optionsPropIndex be the index of optionsProp within values.
                    optionsPropIndex = arrIndexOf.call(values, optionsProp),

                // 3. Let formatPropIndex be the index of formatProp within values.
                    formatPropIndex = arrIndexOf.call(values, formatProp),

                // 4. Let delta be max(min(formatPropIndex - optionsPropIndex, 2), -2).
                    delta = Math.max(Math.min(formatPropIndex - optionsPropIndex, 2), -2);

                // 5. If delta = 2, decrease score by longMorePenalty.
                if (delta === 2)
                    score -= longMorePenalty;

                // 6. Else if delta = 1, decrease score by shortMorePenalty.
                else if (delta === 1)
                    score -= shortMorePenalty;

                // 7. Else if delta = -1, decrease score by shortLessPenalty.
                else if (delta === -1)
                    score -= shortLessPenalty;

                // 8. Else if delta = -2, decrease score by longLessPenalty.
                else if (delta === -2)
                    score -= longLessPenalty;
            }
        }

        // d. If score > bestScore, then
        if (score > bestScore) {
            // i. Let bestScore be score.
            bestScore = score;

            // ii. Let bestFormat be format.
            bestFormat = format;
        }

        // e. Increase i by 1.
        i++;
    }

    // 12. Return bestFormat.
    return bestFormat;
}

/**
 * When the BestFitFormatMatcher abstract operation is called with two arguments options
 * and formats, it performs implementation dependent steps, which should return a set of
 * component representations that a typical user of the selected locale would perceive as
 * at least as good as the one returned by BasicFormatMatcher.
 */
function BestFitFormatMatcher (options, formats) {
    // This is good enough for now
    return BasicFormatMatcher(options, formats);
}

/* 12.2.3 */internals.DateTimeFormat = {
    '[[availableLocales]]': [],
    '[[relevantExtensionKeys]]': ['ca', 'nu'],
    '[[localeData]]': {}
};

/**
 * When the supportedLocalesOf method of Intl.DateTimeFormat is called, the
 * following steps are taken:
 */
/* 12.2.2 */defineProperty(Intl.DateTimeFormat, 'supportedLocalesOf', {
    configurable: true,
    writable: true,
    value: fnBind.call(supportedLocalesOf, internals.DateTimeFormat)
});

/**
 * This named accessor property returns a function that formats a number
 * according to the effective locale and the formatting options of this
 * DateTimeFormat object.
 */
/* 12.3.2 */defineProperty(Intl.DateTimeFormat.prototype, 'format', {
    configurable: true,
    get: function () {
        var internal = this != null && typeof this === 'object' && getInternalProperties(this);

        // Satisfy test 12.3_b
        if (!internal || !internal['[[initializedDateTimeFormat]]'])
            throw new TypeError('`this` value for format() is not an initialized Intl.DateTimeFormat object.');

        // The value of the [[Get]] attribute is a function that takes the following
        // steps:

        // 1. If the [[boundFormat]] internal property of this DateTimeFormat object
        //    is undefined, then:
        if (internal['[[boundFormat]]'] === undefined) {
            var
            // a. Let F be a Function object, with internal properties set as
            //    specified for built-in functions in ES5, 15, or successor, and the
            //    length property set to 0, that takes the argument date and
            //    performs the following steps:
                F = function () {
                    //   i. If date is not provided or is undefined, then let x be the
                    //      result as if by the expression Date.now() where Date.now is
                    //      the standard built-in function defined in ES5, 15.9.4.4.
                    //  ii. Else let x be ToNumber(date).
                    // iii. Return the result of calling the FormatDateTime abstract
                    //      operation (defined below) with arguments this and x.
                    var x = Number(arguments.length === 0 ? Date.now() : arguments[0]);
                    return FormatDateTime(this, x);
                },
            // b. Let bind be the standard built-in function object defined in ES5,
            //    15.3.4.5.
            // c. Let bf be the result of calling the [[Call]] internal method of
            //    bind with F as the this value and an argument list containing
            //    the single item this.
                bf = fnBind.call(F, this);
            // d. Set the [[boundFormat]] internal property of this NumberFormat
            //    object to bf.
            internal['[[boundFormat]]'] = bf;
        }
        // Return the value of the [[boundFormat]] internal property of this
        // NumberFormat object.
        return internal['[[boundFormat]]'];
    }
});

/**
 * When the FormatDateTime abstract operation is called with arguments dateTimeFormat
 * (which must be an object initialized as a DateTimeFormat) and x (which must be a Number
 * value), it returns a String value representing x (interpreted as a time value as
 * specified in ES5, 15.9.1.1) according to the effective locale and the formatting
 * options of dateTimeFormat.
 */
function FormatDateTime(dateTimeFormat, x) {
    // 1. If x is not a finite Number, then throw a RangeError exception.
    if (!isFinite(x))
        throw new RangeError('Invalid valid date passed to format');

    var
        internal = dateTimeFormat.__getInternalProperties(secret),

    // Creating restore point for properties on the RegExp object... please wait
        regexpState = createRegExpRestore(),

    // 2. Let locale be the value of the [[locale]] internal property of dateTimeFormat.
        locale = internal['[[locale]]'],

    // 3. Let nf be the result of creating a new NumberFormat object as if by the
    // expression new Intl.NumberFormat([locale], {useGrouping: false}) where
    // Intl.NumberFormat is the standard built-in constructor defined in 11.1.3.
        nf = new Intl.NumberFormat([locale], {useGrouping: false}),

    // 4. Let nf2 be the result of creating a new NumberFormat object as if by the
    // expression new Intl.NumberFormat([locale], {minimumIntegerDigits: 2, useGrouping:
    // false}) where Intl.NumberFormat is the standard built-in constructor defined in
    // 11.1.3.
        nf2 = new Intl.NumberFormat([locale], {minimumIntegerDigits: 2, useGrouping: false}),

    // 5. Let tm be the result of calling the ToLocalTime abstract operation (defined
    // below) with x, the value of the [[calendar]] internal property of dateTimeFormat,
    // and the value of the [[timeZone]] internal property of dateTimeFormat.
        tm = ToLocalTime(x, internal['[[calendar]]'], internal['[[timeZone]]']),

    // 6. Let result be the value of the [[pattern]] internal property of dateTimeFormat.
        result = internal['[[pattern]]'],

    // Need the locale minus any extensions
        dataLocale = internal['[[dataLocale]]'],

    // Need the calendar data from CLDR
        localeData = internals.DateTimeFormat['[[localeData]]'][dataLocale].calendars,
        ca = internal['[[calendar]]'];

    // 7. For each row of Table 3, except the header row, do:
    for (var p in dateTimeComponents) {
        // a. If dateTimeFormat has an internal property with the name given in the
        //    Property column of the row, then:
        if (hop.call(internal, '[['+ p +']]')) {
            var
            // Assigned values below
                pm, fv,

            //   i. Let p be the name given in the Property column of the row.
            //  ii. Let f be the value of the [[<p>]] internal property of dateTimeFormat.
                f = internal['[['+ p +']]'],

            // iii. Let v be the value of tm.[[<p>]].
                v = tm['[['+ p +']]'];

            //  iv. If p is "year" and v ≤ 0, then let v be 1 - v.
            if (p === 'year' && v <= 0)
                v = 1 - v;

            //   v. If p is "month", then increase v by 1.
            else if (p === 'month')
                v++;

            //  vi. If p is "hour" and the value of the [[hour12]] internal property of
            //      dateTimeFormat is true, then
            else if (p === 'hour' && internal['[[hour12]]'] === true) {
                // 1. Let v be v modulo 12.
                v = v % 12;

                // 2. If v is equal to the value of tm.[[<p>]], then let pm be false; else
                //    let pm be true.
                pm = v !== tm['[['+ p +']]'];

                // 3. If v is 0 and the value of the [[hourNo0]] internal property of
                //    dateTimeFormat is true, then let v be 12.
                if (v === 0 && internal['[[hourNo0]]'] === true)
                    v = 12;
            }

            // vii. If f is "numeric", then
            if (f === 'numeric')
                // 1. Let fv be the result of calling the FormatNumber abstract operation
                //    (defined in 11.3.2) with arguments nf and v.
                fv = FormatNumber(nf, v);

            // viii. Else if f is "2-digit", then
            else if (f === '2-digit') {
                // 1. Let fv be the result of calling the FormatNumber abstract operation
                //    with arguments nf2 and v.
                fv = FormatNumber(nf2, v);

                // 2. If the length of fv is greater than 2, let fv be the substring of fv
                //    containing the last two characters.
                if (fv.length > 2)
                    fv = fv.slice(-2);
            }

            // ix. Else if f is "narrow", "short", or "long", then let fv be a String
            //     value representing f in the desired form; the String value depends upon
            //     the implementation and the effective locale and calendar of
            //     dateTimeFormat. If p is "month", then the String value may also depend
            //     on whether dateTimeFormat has a [[day]] internal property. If p is
            //     "timeZoneName", then the String value may also depend on the value of
            //     the [[inDST]] field of tm.
            else if (f in dateWidths) {
                switch (p) {
                    case 'month':
                        fv = resolveDateString(localeData, ca, 'months', f, tm['[['+ p +']]']);
                        break;

                    case 'weekday':
                        try {
                            fv = resolveDateString(localeData, ca, 'days', f, tm['[['+ p +']]']);
                            // fv = resolveDateString(ca.days, f)[tm['[['+ p +']]']];
                        } catch (e) {
                            throw new Error('Could not find weekday data for locale '+locale);
                        }
                        break;

                    case 'timeZoneName':
                        fv = ''; // TODO
                        break;

                    // TODO: Era
                    default:
                        fv = tm['[['+ p +']]'];
                }
            }

            // x. Replace the substring of result that consists of "{", p, and "}", with
            //    fv.
            result = result.replace('{'+ p +'}', fv);
        }
    }
    // 8. If dateTimeFormat has an internal property [[hour12]] whose value is true, then
    if (internal['[[hour12]]'] === true) {
        // a. If pm is true, then let fv be an implementation and locale dependent String
        //    value representing “post meridiem”; else let fv be an implementation and
        //    locale dependent String value representing “ante meridiem”.
        fv = resolveDateString(localeData, ca, 'dayPeriods', pm ? 'pm' : 'am');

        // b. Replace the substring of result that consists of "{ampm}", with fv.
        result = result.replace('{ampm}', fv);
    }

    // Restore properties of the RegExp object
    regexpState.exp.test(regexpState.input);

    // 9. Return result.
    return result;
}

/**
 * When the ToLocalTime abstract operation is called with arguments date, calendar, and
 * timeZone, the following steps are taken:
 */
function ToLocalTime(date, calendar, timeZone) {
    // 1. Apply calendrical calculations on date for the given calendar and time zone to
    //    produce weekday, era, year, month, day, hour, minute, second, and inDST values.
    //    The calculations should use best available information about the specified
    //    calendar and time zone. If the calendar is "gregory", then the calculations must
    //    match the algorithms specified in ES5, 15.9.1, except that calculations are not
    //    bound by the restrictions on the use of best available information on time zones
    //    for local time zone adjustment and daylight saving time adjustment imposed by
    //    ES5, 15.9.1.7 and 15.9.1.8.
    // ###TODO###
    var d = new Date(date);

    // 2. Return a Record with fields [[weekday]], [[era]], [[year]], [[month]], [[day]],
    //    [[hour]], [[minute]], [[second]], and [[inDST]], each with the corresponding
    //    calculated value.
    return new Record({
        '[[weekday]]': d.getDay(),
        '[[era]]'    : +(d.getFullYear >= 0),
        '[[year]]'   : d.getFullYear(),
        '[[month]]'  : d.getMonth(),
        '[[day]]'    : d.getDate(),
        '[[hour]]'   : d.getHours(),
        '[[minute]]' : d.getMinutes(),
        '[[second]]' : d.getSeconds(),
        '[[inDST]]'  : false // ###TODO###
    });
}

/**
 * The function returns a new object whose properties and attributes are set as if
 * constructed by an object literal assigning to each of the following properties the
 * value of the corresponding internal property of this DateTimeFormat object (see 12.4):
 * locale, calendar, numberingSystem, timeZone, hour12, weekday, era, year, month, day,
 * hour, minute, second, and timeZoneName. Properties whose corresponding internal
 * properties are not present are not assigned.
 */
/* 12.3.3 */defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
    writable: true,
    configurable: true,
    value: function () {
        var prop,
            descs = new Record(),
            props = [
                'locale', 'calendar', 'numberingSystem', 'timeZone', 'hour12', 'weekday',
                'era', 'year', 'month', 'day', 'hour', 'minute', 'second', 'timeZoneName',

                // Not part of the spec, but in here for debugging purposes
                'pattern'
            ],
            internal = this != null && typeof this === 'object' && getInternalProperties(this);

        // Satisfy test 12.3_b
        if (!internal || !internal['[[initializedDateTimeFormat]]'])
            throw new TypeError('`this` value for resolvedOptions() is not an initialized Intl.DateTimeFormat object.');

        for (var i = 0, max = props.length; i < max; i++) {
            if (hop.call(internal, prop = '[[' + props[i] + ']]'))
                descs[props[i]] = { value: internal[prop], writable: true, configurable: true, enumerable: true };
        }

        return objCreate({}, descs);
    }
});

// Sect 13 Locale Sensitive Functions of the ECMAScript Language Specification
// ===========================================================================

/**
 * When the toLocaleString method is called with optional arguments locales and options,
 * the following steps are taken:
 */
/* 13.3.1 */defineProperty(Date.prototype, 'toLocaleString', {
    writable: true,
    configurable: true,
    value: function () {
        // Satisfy test 13.3.0_1
        if (Object.prototype.toString.call(this) !== '[object Date]')
            throw new TypeError('`this` value must be a Date instance for Date.prototype.toLocaleString()');

        var
        // 1. Let x be this time value (as defined in ES5, 15.9.5).
            x = +this;

        // 2. If x is NaN, then return "Invalid Date".
        if (isNaN(x))
            return 'Invalid Date';

        var
        // 3. If locales is not provided, then let locales be undefined.
            locales = arguments[0],

        // 4. If options is not provided, then let options be undefined.
            options = arguments[1],

        // 5. Let options be the result of calling the ToDateTimeOptions abstract
        //    operation (defined in 12.1.1) with arguments options, "any", and "all".
            options = ToDateTimeOptions(options, 'any', 'all'),

        // 6. Let dateTimeFormat be the result of creating a new object as if by the
        //    expression new Intl.DateTimeFormat(locales, options) where
        //    Intl.DateTimeFormat is the standard built-in constructor defined in 12.1.3.
            dateTimeFormat = new DateTimeFormatConstructor(locales, options);

        // 7. Return the result of calling the FormatDateTime abstract operation (defined
        //    in 12.3.2) with arguments dateTimeFormat and x.
        return FormatDateTime(dateTimeFormat, x);
    }
});

/**
 * When the toLocaleDateString method is called with optional arguments locales and
 * options, the following steps are taken:
 */
/* 13.3.2 */defineProperty(Date.prototype, 'toLocaleDateString', {
    writable: true,
    configurable: true,
    value: function () {
        // Satisfy test 13.3.0_1
        if (Object.prototype.toString.call(this) !== '[object Date]')
            throw new TypeError('`this` value must be a Date instance for Date.prototype.toLocaleDateString()');

        var
        // 1. Let x be this time value (as defined in ES5, 15.9.5).
            x = +this;

        // 2. If x is NaN, then return "Invalid Date".
        if (isNaN(x))
            return 'Invalid Date';

        var
        // 3. If locales is not provided, then let locales be undefined.
            locales = arguments[0],

        // 4. If options is not provided, then let options be undefined.
            options = arguments[1],

        // 5. Let options be the result of calling the ToDateTimeOptions abstract
        //    operation (defined in 12.1.1) with arguments options, "date", and "date".
            options = ToDateTimeOptions(options, 'date', 'date'),

        // 6. Let dateTimeFormat be the result of creating a new object as if by the
        //    expression new Intl.DateTimeFormat(locales, options) where
        //    Intl.DateTimeFormat is the standard built-in constructor defined in 12.1.3.
            dateTimeFormat = new DateTimeFormatConstructor(locales, options);

        // 7. Return the result of calling the FormatDateTime abstract operation (defined
        //    in 12.3.2) with arguments dateTimeFormat and x.
        return FormatDateTime(dateTimeFormat, x);
    }
});

/**
 * When the toLocaleTimeString method is called with optional arguments locales and
 * options, the following steps are taken:
 */
/* 13.3.3 */defineProperty(Date.prototype, 'toLocaleTimeString', {
    writable: true,
    configurable: true,
    value: function () {
        // Satisfy test 13.3.0_1
        if (Object.prototype.toString.call(this) !== '[object Date]')
            throw new TypeError('`this` value must be a Date instance for Date.prototype.toLocaleTimeString()');

        var
        // 1. Let x be this time value (as defined in ES5, 15.9.5).
            x = +this;

        // 2. If x is NaN, then return "Invalid Date".
        if (isNaN(x))
            return 'Invalid Date';

        var
        // 3. If locales is not provided, then let locales be undefined.
            locales = arguments[0],

        // 4. If options is not provided, then let options be undefined.
            options = arguments[1],

        // 5. Let options be the result of calling the ToDateTimeOptions abstract
        //    operation (defined in 12.1.1) with arguments options, "time", and "time".
            options = ToDateTimeOptions(options, 'time', 'time'),

        // 6. Let dateTimeFormat be the result of creating a new object as if by the
        //    expression new Intl.DateTimeFormat(locales, options) where
        //    Intl.DateTimeFormat is the standard built-in constructor defined in 12.1.3.
            dateTimeFormat = new DateTimeFormatConstructor(locales, options);

        // 7. Return the result of calling the FormatDateTime abstract operation (defined
        //    in 12.3.2) with arguments dateTimeFormat and x.
        return FormatDateTime(dateTimeFormat, x);
    }
});

/**
 * Returns a string for a date component, resolved using multiple inheritance as specified
 * as specified in the Unicode Technical Standard 35.
 */
function resolveDateString(data, ca, component, width, key) {
    // From http://www.unicode.org/reports/tr35/tr35.html#Multiple_Inheritance:
    // 'In clearly specified instances, resources may inherit from within the same locale.
    //  For example, ... the Buddhist calendar inherits from the Gregorian calendar.'
    var obj = data[ca] && data[ca][component]
                ? data[ca][component]
                : data.gregory[component],

        // "sideways" inheritance resolves strings when a key doesn't exist
        alts = {
            narrow: ['short', 'long'],
            short:  ['long', 'narrow'],
            long:   ['short', 'narrow']
        },

        //
        resolved = hop.call(obj, width)
                  ? obj[width]
                  : hop.call(obj, alts[width][0])
                      ? obj[alts[width][0]]
                      : obj[alts[width][1]];

    // `key` wouldn't be specified for components 'dayPeriods'
    return key != null ? resolved[key] : resolved;
}

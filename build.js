#!/usr/bin/env node
/**
 * Copyright 2013 Andy Earnshaw, MIT License
 *
 * Compiles the source files in the ./src/ directory and optionally rebuilds the
 * CLDR data in ./cldr/ and JSON files in ./locale-data/
 */

var
    spawn   = require('child_process').spawn,
    uglify  = require('uglify-js'),
    fs      = require('fs'),

    // Easy CLI
    program = require('commander')
        .usage('[options] [file]')

        .option('-r, --rebuild-json', 'Recreate the JSON files, including only the data required by this build.')
        .option('--cldr-path <path>', 'Path to the Unicode CLDR core and tools files used to rebuild data. Implies -r.')
        .option('--complete',         'Compiles with all locale data built-in, removes Intl.__addLocaleData(). Implies -r.')

        // Number specific options
//      .option('--full-numbers',  'Output data for all numbering systems, including those not normally used by the locale.')
        .option('--no-currencies', 'Exclude currency symbols when rebuilding JSON')

        // DateTime specific options
//      .option('--calendars <ca>', 'Include CA calendars when rebuilding JSON. Use ALL for all.')
        .option('--no-dates',       'Build without Intl.DateTimeFormat, Date.prototype.toLocaleString et al.')

        .parse(process.argv);

    // Output file name
    outFile = program.args[0] || 'Intl.min.js',

    // Our files to merge, in order
    files = [ 'globals.js', 'abstracts.js', 'bcp47.js', 'NumberFormat.js', 'DateTimeFormat.js' ],

    // Wrap our code in a module function pattern
    wrap = ['typeof exports !== "undefined" && exports || (function () { return this.Intl = {} })():Intl'],

    // Easy-to-maintain license saves faffing with multi-line strings (don't try this at home)
    license = String(function () {
            /*!
             * Copyright 2013 Andy Earnshaw, MIT License
             *
             * Implements the ECMAScript Internationalization API in ES5-compatible environments,
             * following the ECMA-402 specification as closely as possible
             *
             * ECMA-402: http://ecma-international.org/ecma-402/1.0/
             *
             * CLDR format locale data should be provided using Intl.__addLocaleData().
             */
        }).replace(/^\s+(?!\*)|^function.*\s+|\s+}/gm, '');

if (program.complete)
    files.push('internal.js');

if (program.cldrPath)
    program.rebuildJson = true;

if (!program.dates)
    files.splice(files.indexOf('DateTimeFormat.js'), 1);

if (program.rebuildJson) {
    var child = spawn(
                    process.argv[0],
                    [__dirname + '/tools/Ldml2Json.js', program.dates ? '' : '--no-dates', program.currencies ? '' : '--no-currencies' ],
                    { stdio: 'inherit' }
                );

    child.on('exit', function () {
        compress();
    });
}
else
    compress();

function compress () {
    var compress =  uglify.Compressor(),
        map      =  uglify.SourceMap(),
        out      =  uglify.OutputStream({ source_map: map, comments: /^!/ });
        mapFile  =  outFile + '.map',
        wrapped  =  false;
        toplevel =  files.reduce(function (toplevel, file) {
                        var code = fs.readFileSync(__dirname + '/src/' + file, 'utf8');
                        return uglify.parse(code, {
                                   filename: 'src/' + file,
                                   toplevel: toplevel
                               });
                    }, null).wrap_enclose(wrap),

        license  =  uglify.parse(license),

        // Finally, compress the code
        compressed = (toplevel.figure_out_scope(), toplevel.transform(compress));

    // Insert the license above
    compressed.start.comments_before = license.start.comments_before;
    compressed.figure_out_scope();
    compressed.compute_char_frequency();
    compressed.mangle_names();

    //toplevel.print(out);
    compressed.print(out);

    // Write the source map first
    fs.writeFileSync(mapFile, map.toString());

    // Now the minified .js file
    fs.writeFileSync(outFile, out.toString() + '/*\n//# sourceMappingURL='+mapFile+ '\n*/');
}

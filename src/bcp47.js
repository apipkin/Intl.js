/**
 * Copyright 2013 Andy Earnshaw, MIT License
 *
 * Defines, and assigns to, variables related to the BCP 47 specification
 */
var
    // Some regular expressions we're using
    expInsertGroups = /(?=(?!^)(?:\d{3})+(?!\d))/g,
    expCurrencyCode = /^[A-Z]{3}$/,
    expUnicodeExSeq = /-u(?:-[0-9a-z]{2,8})+/gi, // See `extension` below

    expBCP47Syntax,
    expExtSequences,
    expVariantDupes,
    expSingletonDupes,

    // IANA Subtag Registry redundant tag and subtag maps
    redundantTags = {
        tags: {
            "art-lojban":   "jbo",       "i-ami":        "ami",       "i-bnn":       "bnn",  "i-hak":      "hak",
            "i-klingon":    "tlh",       "i-lux":        "lb",        "i-navajo":    "nv",   "i-pwn":      "pwn",
            "i-tao":        "tao",       "i-tay":        "tay",       "i-tsu":       "tsu",  "no-bok":     "nb",
            "no-nyn":       "nn",        "sgn-BE-FR":    "sfb",       "sgn-BE-NL":   "vgt",  "sgn-CH-DE":  "sgg",
            "zh-guoyu":     "cmn",       "zh-hakka":     "hak",       "zh-min-nan":  "nan",  "zh-xiang":   "hsn",
            "sgn-BR":       "bzs",       "sgn-CO":       "csn",       "sgn-DE":      "gsg",  "sgn-DK":     "dsl",
            "sgn-ES":       "ssp",       "sgn-FR":       "fsl",       "sgn-GB":      "bfi",  "sgn-GR":     "gss",
            "sgn-IE":       "isg",       "sgn-IT":       "ise",       "sgn-JP":      "jsl",  "sgn-MX":     "mfs",
            "sgn-NI":       "ncs",       "sgn-NL":       "dse",       "sgn-NO":      "nsl",  "sgn-PT":     "psr",
            "sgn-SE":       "swl",       "sgn-US":       "ase",       "sgn-ZA":      "sfs",  "zh-cmn":     "cmn",
            "zh-cmn-Hans":  "cmn-Hans",  "zh-cmn-Hant":  "cmn-Hant",  "zh-gan":      "gan",  "zh-wuu":     "wuu",
            "zh-yue":       "yue"
        },
        subtags: {
              BU: "MM",   DD: "DE",   FX: "FR",   TP: "TL",   YD: "YE",   ZR: "CD",  heploc: "alalc97",
            'in': "id",   iw: "he",   ji:  "yi",  jw: "jv",   mo: "ro",  ayx: "nun", bjd: "drl",
             ccq: "rki", cjr: "mom", cka: "cmr", cmk: "xch", drh: "khk", drw: "prs", gav: "dev",
             hrr: "jal", ibi: "opa", kgh: "kml", lcq: "ppr", mst: "mry", myt: "mry", sca: "hle",
             tie: "ras", tkk: "twm", tlw: "weo", tnf: "prs", ybd: "rki", yma: "lrr"
        },
        extLang: {
            aao: [ "aao", "ar"  ], abh: [ "abh", "ar"  ], abv: [ "abv", "ar"  ], acm: [ "acm", "ar"  ],
            acq: [ "acq", "ar"  ], acw: [ "acw", "ar"  ], acx: [ "acx", "ar"  ], acy: [ "acy", "ar"  ],
            adf: [ "adf", "ar"  ], ads: [ "ads", "sgn" ], aeb: [ "aeb", "ar"  ], aec: [ "aec", "ar"  ],
            aed: [ "aed", "sgn" ], aen: [ "aen", "sgn" ], afb: [ "afb", "ar"  ], afg: [ "afg", "sgn" ],
            ajp: [ "ajp", "ar"  ], apc: [ "apc", "ar"  ], apd: [ "apd", "ar"  ], arb: [ "arb", "ar"  ],
            arq: [ "arq", "ar"  ], ars: [ "ars", "ar"  ], ary: [ "ary", "ar"  ], arz: [ "arz", "ar"  ],
            ase: [ "ase", "sgn" ], asf: [ "asf", "sgn" ], asp: [ "asp", "sgn" ], asq: [ "asq", "sgn" ],
            asw: [ "asw", "sgn" ], auz: [ "auz", "ar"  ], avl: [ "avl", "ar"  ], ayh: [ "ayh", "ar"  ],
            ayl: [ "ayl", "ar"  ], ayn: [ "ayn", "ar"  ], ayp: [ "ayp", "ar"  ], bbz: [ "bbz", "ar"  ],
            bfi: [ "bfi", "sgn" ], bfk: [ "bfk", "sgn" ], bjn: [ "bjn", "ms"  ], bog: [ "bog", "sgn" ],
            bqn: [ "bqn", "sgn" ], bqy: [ "bqy", "sgn" ], btj: [ "btj", "ms"  ], bve: [ "bve", "ms"  ],
            bvl: [ "bvl", "sgn" ], bvu: [ "bvu", "ms"  ], bzs: [ "bzs", "sgn" ], cdo: [ "cdo", "zh"  ],
            cds: [ "cds", "sgn" ], cjy: [ "cjy", "zh"  ], cmn: [ "cmn", "zh"  ], coa: [ "coa", "ms"  ],
            cpx: [ "cpx", "zh"  ], csc: [ "csc", "sgn" ], csd: [ "csd", "sgn" ], cse: [ "cse", "sgn" ],
            csf: [ "csf", "sgn" ], csg: [ "csg", "sgn" ], csl: [ "csl", "sgn" ], csn: [ "csn", "sgn" ],
            csq: [ "csq", "sgn" ], csr: [ "csr", "sgn" ], czh: [ "czh", "zh"  ], czo: [ "czo", "zh"  ],
            doq: [ "doq", "sgn" ], dse: [ "dse", "sgn" ], dsl: [ "dsl", "sgn" ], dup: [ "dup", "ms"  ],
            ecs: [ "ecs", "sgn" ], esl: [ "esl", "sgn" ], esn: [ "esn", "sgn" ], eso: [ "eso", "sgn" ],
            eth: [ "eth", "sgn" ], fcs: [ "fcs", "sgn" ], fse: [ "fse", "sgn" ], fsl: [ "fsl", "sgn" ],
            fss: [ "fss", "sgn" ], gan: [ "gan", "zh"  ], gds: [ "gds", "sgn" ], gom: [ "gom", "kok" ],
            gse: [ "gse", "sgn" ], gsg: [ "gsg", "sgn" ], gsm: [ "gsm", "sgn" ], gss: [ "gss", "sgn" ],
            gus: [ "gus", "sgn" ], hab: [ "hab", "sgn" ], haf: [ "haf", "sgn" ], hak: [ "hak", "zh"  ],
            hds: [ "hds", "sgn" ], hji: [ "hji", "ms"  ], hks: [ "hks", "sgn" ], hos: [ "hos", "sgn" ],
            hps: [ "hps", "sgn" ], hsh: [ "hsh", "sgn" ], hsl: [ "hsl", "sgn" ], hsn: [ "hsn", "zh"  ],
            icl: [ "icl", "sgn" ], ils: [ "ils", "sgn" ], inl: [ "inl", "sgn" ], ins: [ "ins", "sgn" ],
            ise: [ "ise", "sgn" ], isg: [ "isg", "sgn" ], isr: [ "isr", "sgn" ], jak: [ "jak", "ms"  ],
            jax: [ "jax", "ms"  ], jcs: [ "jcs", "sgn" ], jhs: [ "jhs", "sgn" ], jls: [ "jls", "sgn" ],
            jos: [ "jos", "sgn" ], jsl: [ "jsl", "sgn" ], jus: [ "jus", "sgn" ], kgi: [ "kgi", "sgn" ],
            knn: [ "knn", "kok" ], kvb: [ "kvb", "ms"  ], kvk: [ "kvk", "sgn" ], kvr: [ "kvr", "ms"  ],
            kxd: [ "kxd", "ms"  ], lbs: [ "lbs", "sgn" ], lce: [ "lce", "ms"  ], lcf: [ "lcf", "ms"  ],
            liw: [ "liw", "ms"  ], lls: [ "lls", "sgn" ], lsg: [ "lsg", "sgn" ], lsl: [ "lsl", "sgn" ],
            lso: [ "lso", "sgn" ], lsp: [ "lsp", "sgn" ], lst: [ "lst", "sgn" ], lsy: [ "lsy", "sgn" ],
            ltg: [ "ltg", "lv"  ], lvs: [ "lvs", "lv"  ], lzh: [ "lzh", "zh"  ], max: [ "max", "ms"  ],
            mdl: [ "mdl", "sgn" ], meo: [ "meo", "ms"  ], mfa: [ "mfa", "ms"  ], mfb: [ "mfb", "ms"  ],
            mfs: [ "mfs", "sgn" ], min: [ "min", "ms"  ], mnp: [ "mnp", "zh"  ], mqg: [ "mqg", "ms"  ],
            mre: [ "mre", "sgn" ], msd: [ "msd", "sgn" ], msi: [ "msi", "ms"  ], msr: [ "msr", "sgn" ],
            mui: [ "mui", "ms"  ], mzc: [ "mzc", "sgn" ], mzg: [ "mzg", "sgn" ], mzy: [ "mzy", "sgn" ],
            nan: [ "nan", "zh"  ], nbs: [ "nbs", "sgn" ], ncs: [ "ncs", "sgn" ], nsi: [ "nsi", "sgn" ],
            nsl: [ "nsl", "sgn" ], nsp: [ "nsp", "sgn" ], nsr: [ "nsr", "sgn" ], nzs: [ "nzs", "sgn" ],
            okl: [ "okl", "sgn" ], orn: [ "orn", "ms"  ], ors: [ "ors", "ms"  ], pel: [ "pel", "ms"  ],
            pga: [ "pga", "ar"  ], pks: [ "pks", "sgn" ], prl: [ "prl", "sgn" ], prz: [ "prz", "sgn" ],
            psc: [ "psc", "sgn" ], psd: [ "psd", "sgn" ], pse: [ "pse", "ms"  ], psg: [ "psg", "sgn" ],
            psl: [ "psl", "sgn" ], pso: [ "pso", "sgn" ], psp: [ "psp", "sgn" ], psr: [ "psr", "sgn" ],
            pys: [ "pys", "sgn" ], rms: [ "rms", "sgn" ], rsi: [ "rsi", "sgn" ], rsl: [ "rsl", "sgn" ],
            sdl: [ "sdl", "sgn" ], sfb: [ "sfb", "sgn" ], sfs: [ "sfs", "sgn" ], sgg: [ "sgg", "sgn" ],
            sgx: [ "sgx", "sgn" ], shu: [ "shu", "ar"  ], slf: [ "slf", "sgn" ], sls: [ "sls", "sgn" ],
            sqk: [ "sqk", "sgn" ], sqs: [ "sqs", "sgn" ], ssh: [ "ssh", "ar"  ], ssp: [ "ssp", "sgn" ],
            ssr: [ "ssr", "sgn" ], svk: [ "svk", "sgn" ], swc: [ "swc", "sw"  ], swh: [ "swh", "sw"  ],
            swl: [ "swl", "sgn" ], syy: [ "syy", "sgn" ], tmw: [ "tmw", "ms"  ], tse: [ "tse", "sgn" ],
            tsm: [ "tsm", "sgn" ], tsq: [ "tsq", "sgn" ], tss: [ "tss", "sgn" ], tsy: [ "tsy", "sgn" ],
            tza: [ "tza", "sgn" ], ugn: [ "ugn", "sgn" ], ugy: [ "ugy", "sgn" ], ukl: [ "ukl", "sgn" ],
            uks: [ "uks", "sgn" ], urk: [ "urk", "ms"  ], uzn: [ "uzn", "uz"  ], uzs: [ "uzs", "uz"  ],
            vgt: [ "vgt", "sgn" ], vkk: [ "vkk", "ms"  ], vkt: [ "vkt", "ms"  ], vsi: [ "vsi", "sgn" ],
            vsl: [ "vsl", "sgn" ], vsv: [ "vsv", "sgn" ], wuu: [ "wuu", "zh"  ], xki: [ "xki", "sgn" ],
            xml: [ "xml", "sgn" ], xmm: [ "xmm", "ms"  ], xms: [ "xms", "sgn" ], yds: [ "yds", "sgn" ],
            ysl: [ "ysl", "sgn" ], yue: [ "yue", "zh"  ], zib: [ "zib", "sgn" ], zlm: [ "zlm", "ms"  ],
            zmi: [ "zmi", "ms"  ], zsl: [ "zsl", "sgn" ], zsm: [ "zsm", "ms"  ]
        }
    };

/**
 * Defines regular expressions for various operations related to the BCP 47 syntax,
 * as defined at http://tools.ietf.org/html/bcp47#section-2.1
 */
(function () {
    var
        // extlang       = 3ALPHA              ; selected ISO 639 codes
        //                 *2("-" 3ALPHA)      ; permanently reserved
        extlang = '[a-z]{3}(?:-[a-z]{3}){0,2}',

        // language      = 2*3ALPHA            ; shortest ISO 639 code
        //                 ["-" extlang]       ; sometimes followed by
        //                                     ; extended language subtags
        //               / 4ALPHA              ; or reserved for future use
        //               / 5*8ALPHA            ; or registered language subtag
        language = '(?:[a-z]{2,3}(?:-' + extlang + ')?|[a-z]{4}|[a-z]{5,8})',

        // script        = 4ALPHA              ; ISO 15924 code
        script = '[a-z]{4}',

        // region        = 2ALPHA              ; ISO 3166-1 code
        //               / 3DIGIT              ; UN M.49 code
        region = '(?:[a-z]{2}|\\d{3})',

        // variant       = 5*8alphanum         ; registered variants
        //               / (DIGIT 3alphanum)
        variant = '(?:[a-z0-9]{5,8}|\\d[a-z0-9]{3})',

        //                                     ; Single alphanumerics
        //                                     ; "x" reserved for private use
        // singleton     = DIGIT               ; 0 - 9
        //               / %x41-57             ; A - W
        //               / %x59-5A             ; Y - Z
        //               / %x61-77             ; a - w
        //               / %x79-7A             ; y - z
        singleton = '[0-9a-wy-z]',

        // extension     = singleton 1*("-" (2*8alphanum))
        extension = singleton + '(?:-[a-z0-9]{2,8})+',

        // privateuse    = "x" 1*("-" (1*8alphanum))
        privateuse = 'x(?:-[a-z0-9]{1,8})+',

        // irregular     = "en-GB-oed"         ; irregular tags do not match
        //               / "i-ami"             ; the 'langtag' production and
        //               / "i-bnn"             ; would not otherwise be
        //               / "i-default"         ; considered 'well-formed'
        //               / "i-enochian"        ; These tags are all valid,
        //               / "i-hak"             ; but most are deprecated
        //               / "i-klingon"         ; in favor of more modern
        //               / "i-lux"             ; subtags or subtag
        //               / "i-mingo"           ; combination
        //               / "i-navajo"
        //               / "i-pwn"
        //               / "i-tao"
        //               / "i-tay"
        //               / "i-tsu"
        //               / "sgn-BE-FR"
        //               / "sgn-BE-NL"
        //               / "sgn-CH-DE"
        irregular = '(?:en-GB-oed'
                  + '|i-(?:ami|bnn|default|enochian|hak|klingon|lux|mingo|navajo|pwn|tao|tay|tsu)'
                  + '|sgn-(?:BE-FR|BE-NL|CH-DE))',

        // regular       = "art-lojban"        ; these tags match the 'langtag'
        //               / "cel-gaulish"       ; production, but their subtags
        //               / "no-bok"            ; are not extended language
        //               / "no-nyn"            ; or variant subtags: their meaning
        //               / "zh-guoyu"          ; is defined by their registration
        //               / "zh-hakka"          ; and all of these are deprecated
        //               / "zh-min"            ; in favor of a more modern
        //               / "zh-min-nan"        ; subtag or sequence of subtags
        //               / "zh-xiang"
        regular = '(?:art-lojban|cel-gaulish|no-bok|no-nyn'
                + '|zh-(?:guoyu|hakka|min|min-nan|xiang))',

        // grandfathered = irregular           ; non-redundant tags registered
        //               / regular             ; during the RFC 3066 era
        grandfathered = '(?:' + irregular + '|' + regular + ')',

        // langtag       = language
        //                 ["-" script]
        //                 ["-" region]
        //                 *("-" variant)
        //                 *("-" extension)
        //                 ["-" privateuse]
        langtag = language + '(?:-' + script + ')?(?:-' + region + ')?(?:-'
                + variant + ')*(?:-' + extension + ')*(?:-' + privateuse + ')?';

    // Language-Tag  = langtag             ; normal language tags
    //               / privateuse          ; private use tag
    //               / grandfathered       ; grandfathered tags
    expBCP47Syntax = RegExp('^(?:'+langtag+'|'+privateuse+'|'+grandfathered+')$', 'i');

    // Match duplicate variants in a language tag
    expVariantDupes = RegExp('^(?!x).*?-('+variant+')-(?:\\w{4,8}-(?!x-))*\\1\\b', 'i');

    // Match duplicate singletons in a language tag (except in private use)
    expSingletonDupes = RegExp('^(?!x).*?-('+singleton+')-(?:\\w+-(?!x-))*\\1\\b', 'i');

    // Match all extension sequences
    expExtSequences = RegExp('-'+extension, 'ig');
})();

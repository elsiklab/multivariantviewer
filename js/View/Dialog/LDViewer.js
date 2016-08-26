define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/io-query',
    'dojo/request',
    'dijit/Dialog'
],
function(
    declare,
    array,
    lang,
    ioQuery,
    request,
    Dialog
) {
    return declare(Dialog, {
        title: 'MultiVariantViewer',
        getColor: function(track, feature, genotype, genotypeFull) {
            return track.getConf('style.color', [feature, genotype, genotypeFull]);
        },
        show: function(args) {
            var track = args.track;
            var browser = args.browser;
            var region = browser.view.visibleRegion();
            var w = 800;
            var h = 2300;
            var ref = 'chr';

            var ret = dojo.create('div', { className: 'canvascontainer' }, this.container);
            var c = dojo.create('canvas', { width: w * 2, height: h * 2, style: { width: w + 'px', height: h + 'px' } }, ret);
            var ctx = c.getContext('2d');
            var feats = [];
            var color = lang.hitch(this, 'getColor');
            ctx.scale(2, 2);
            var matrix = {};

            // find actual refseq name in VCF file, for ex in volvox it's contigA instead of ctgA
            track.store.getVCFHeader().then(function() {
                track.store.indexedData.getLines(
                    region.ref,
                    region.start,
                    region.end,
                    function(line) {
                        ref = line.ref;
                    },
                    function() {
                        request(args.ldviewer + '?' + ioQuery.objectToQuery({ ref: ref, start: region.start, end: region.end, url: args.url })).then(function(ret) {
                            ret.split('\n').slice(1).forEach(function(line) {
                                var l = line.trim();
                                var r = l.split(/ +/);
                                console.log(r);
                            });
                        }, function(error) {
                            console.error('error', error);
                        });
                    },
                    function(error) {
                        console.error('error', error);
                    }
                );
            }, function(error) {
                console.error('error', error);
            });

            this.set('content', ret);
            this.inherited(arguments);
        }

    });
});

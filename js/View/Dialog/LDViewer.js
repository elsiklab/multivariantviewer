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
            var ref = 'chr';
            var thisB = this;
            var div = dojo.create('div', { className: 'containerld' }, this.container);
            var c = dojo.create('canvas', { className: 'canvasld' }, div);
            var p = dojo.create('p', { className: 'errorld' }, div);
            var snps = [];
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
                        request(args.ldviewer + '?' + ioQuery.objectToQuery({ ref: ref, start: region.start, end: region.end, url: args.url })).then(function(res) {
                            res.split('\n').slice(1).slice(0, -1).forEach(function(line) {
                                var l = line.trim();
                                var r = l.split(/ +/);
                                if (snps.indexOf(r[2]) == -1) {
                                    snps.push(r[2]);
                                }
                                if (!matrix[r[2]]) {
                                    matrix[r[2]] = {};
                                }
                                matrix[r[2]][r[5]] = +r[6];
                            });

                            var w = snps.length * 20 + 200;
                            var h = snps.length * 10 + 200;
                            c.width = w * 2;
                            c.height = h * 2;
                            c.style.width = w + 'px';
                            c.style.height = h + 'px';
                            var ctx = c.getContext('2d');
                            ctx.scale(2, 2);
                            thisB.resize();
                            for (var i = 0; i < snps.length; i++) {
                                var snp = snps[i];
                                ctx.save();
                                ctx.translate(50 + i * 20, 50);
                                ctx.rotate(-Math.PI / 4);
                                ctx.textAlign = 'left';
                                ctx.fillText(snp, 0, 0);
                                ctx.restore();
                            }

                            ctx.translate(43, 80);
                            ctx.rotate(-Math.PI / 4);
                            for (var i = 0; i < snps.length; i++) {
                                var snp_i = snps[i];
                                for (var j = i; j < snps.length; j++) {
                                    var snp_j = snps[j];
                                    ctx.fillStyle = 'hsl(0,80%,' + (90 - matrix[snp_i][snp_j] * 50) + '%)';
                                    ctx.fillRect(i * 14.14, j * 14.14, 14.14, 14.14);
                                    ctx.fill();
                                }
                            }
                        }, function(error) {
                            console.error('error', error.message);
                            p.innerHTML = error.message;
                        });
                    },
                    function(error) {
                        console.error('error', error);
                    }
                );
            }, function(error) {
                console.error('error', error);
            });

            this.set('content', div);
            this.inherited(arguments);
        }
    });
});

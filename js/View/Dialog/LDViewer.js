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
            var ref;
            var thisB = this;
            var div = dojo.create('div', { className: 'containerld' }, this.container);
            var c = dojo.create('canvas', { className: 'canvasld' }, div);
            var p = dojo.create('p', { className: 'errorld' }, div);
            dojo.style(this.containerNode, 'overflow', 'auto');


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
                        var query = {
                            ref: ref,
                            start: region.start,
                            end: region.end,
                            url: args.url
                        };
                        request(args.ldviewer + '?' + ioQuery.objectToQuery(query)).then(function(res) {
                            var i = 0;
                            var j = 0;
                            var k = 0;
                            var line;
                            var snps = [];
                            var lines = res.split('\n');
                            while (lines[j] !== 'break' && j < lines.length) {
                                line = lines[j++].trim();
                                if (line !== '') {
                                    snps.push(line);
                                }
                            }
                            j++; // skip 'break' line

                            // resize dialog canvas
                            var w = snps.length * 20 + 200;
                            var h = snps.length * 10 + 200;
                            c.width = w * 2;
                            c.height = h * 2;
                            c.style.width = w + 'px';
                            c.style.height = h + 'px';
                            var ctx = c.getContext('2d');
                            ctx.scale(2, 2);
                            thisB.resize();
                            thisB._position();

                            // render snp names
                            for (i = 0; i < snps.length; i++) {
                                var snp = snps[i];
                                ctx.save();
                                ctx.translate(50 + i * 20, 50);
                                ctx.rotate(-Math.PI / 4);
                                ctx.textAlign = 'left';
                                ctx.fillText(snp, 0, 0);
                                ctx.restore();
                            }

                            // render triangle rotated
                            ctx.translate(43, 80);
                            ctx.rotate(-Math.PI / 4);
                            while (j < lines.length) {
                                line = lines[j].trim();
                                if (line !== '') {
                                    var scores = line.split('\t');
                                    for (i = 0; i < scores.length; i++) {
                                        var score = scores[i];
                                        ctx.fillStyle = 'hsl(0,80%,' + (90 - score * 50) + '%)';
                                        ctx.fillRect(i * 14.14, k * 14.14, 14.14, 14.14);
                                        ctx.fill();
                                    }
                                }
                                j++;
                                k++;
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

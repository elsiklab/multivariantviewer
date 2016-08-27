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
            var p = dojo.create('p', { className: 'errorld' }, div);
            var c = dojo.create('canvas', { className: 'canvasld' }, div);
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
                            var r = thisB.parseResults(res);
                            r.canvas = c;
                            r.boxw = 18;
                            thisB.renderBox(r);
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
        },

        parseResults: function(res) {
            var j = 0;
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
            var scores = [];
            while (j < lines.length) {
                line = lines[j].trim();
                if (line !== '') {
                    var scoreline = line.split('\t');
                    scores.push(scoreline);
                }
                j++;
            }
            return {
                scores: scores,
                snps: snps
            };
        },

        renderBox: function(args) {
            var c = args.canvas;
            var snps = args.snps;
            var scores = args.scores;
            var boxw = args.boxw;
            var bw = boxw / Math.sqrt(2);
            var height = args.height;

            // resize dialog canvas
            var w = snps.length * boxw + 200;
            var h = snps.length * boxw + 200;
            c.width = w * 2;
            c.height = h * 2;
            c.style.width = w + 'px';
            c.style.height = h + 'px';
            var ctx = c.getContext('2d');
            ctx.scale(2, 2);
            this.resize();
            this._position();

            // render snp names
            for (var i = 0; i < snps.length; i++) {
                var snp = snps[i];
                ctx.save();
                ctx.translate(50 + i * boxw, 50);
                ctx.rotate(-Math.PI / 4);
                ctx.textAlign = 'left';
                ctx.fillText(snp, 0, 0);
                ctx.restore();
            }

            // render triangle rotated
            ctx.translate(43, 80);
            ctx.rotate(-Math.PI / 4);
            for (var j = 0; j < scores.length; j++) {
                var line = scores[j];
                for (var i = 0; i < line.length; i++) {
                    var score = line[i];
                    ctx.fillStyle = 'hsl(0,80%,' + (90 - score * 50) + '%)';
                    ctx.fillRect(i * bw, j * bw, bw, bw);
                    ctx.fill();
                }
            }
        }
    });
});

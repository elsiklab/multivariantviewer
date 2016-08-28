define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/io-query',
    'dojo/request',
    'dojo/Deferred',
    'dijit/Dialog'
],
function(
    declare,
    array,
    lang,
    on,
    ioQuery,
    request,
    Deferred,
    Dialog
) {
    return declare(Dialog, {
        title: 'MultiVariantViewer',
        getColor: function(track, feature, genotype, genotypeFull) {
            return track.getConf('style.color', [feature, genotype, genotypeFull]);
        },
        show: function(args) {
            this.track = args.track;
            this.browser = args.browser;
            this.boxw = 18;
            this.drawnames = true;

            var def = new Deferred();
            var thisB = this;
            var ref;


            var div = dojo.create('div', { className: 'containerld' }, this.container);
            var input = dojo.create('input', { id: 'numberinput', type: 'number', value: 18 }, div);
            dojo.create('label', { for: 'numberinput', innerHTML: 'Box size' }, div);
            var checkbox = dojo.create('input', { id: 'drawnames', type: 'checkbox', checked: 'checked' }, div);
            dojo.create('label', { for: 'drawnames', innerHTML: 'Draw names' }, div);
            dojo.create('br');
            this.canvas = dojo.create('canvas', { className: 'canvasld' }, div);

            on(input, 'change', function() {
                thisB.boxw = input.value;
                def.then(function() {
                    thisB.renderBox();
                });
            });
            on(checkbox, 'change', function() {
                thisB.drawnames = checkbox.checked;
                def.then(function() {
                    thisB.renderBox();
                });
            });
            var p = dojo.create('p', { className: 'errorld' }, div);
            dojo.style(this.containerNode, 'overflow', 'auto');

            // find actual refseq name in VCF file, for ex in volvox it's contigA instead of ctgA
            var region = this.browser.view.visibleRegion();
            this.track.store.getVCFHeader().then(function() {
                thisB.track.store.indexedData.getLines(
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
                            def.resolve();
                            thisB.results = thisB.parseResults(res);
                            thisB.renderBox();
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

        renderBox: function() {
            var c = this.canvas;
            var snps = this.results.snps;
            var scores = this.results.scores;
            var boxw = this.boxw;
            var bw = boxw / Math.sqrt(2);

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
            if (this.drawnames) {
                for (var i = 0; i < snps.length; i++) {
                    var snp = snps[i];
                    ctx.save();
                    ctx.translate(50 + i * boxw, 50);
                    ctx.rotate(-Math.PI / 4);
                    ctx.textAlign = 'left';
                    ctx.fillText(snp, 0, 0);
                    ctx.restore();
                }
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

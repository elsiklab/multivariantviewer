define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/request',
    'dojo/dom-construct',
    'dojo/io-query',
    'JBrowse/View/Track/BlockBased',
    'JBrowse/Util',
    'dojo/Deferred'
],
function(
    declare,
    array,
    lang,
    request,
    dom,
    ioQuery,
    BlockBased,
    Util,
    Deferred
) {
    return declare(BlockBased, {
        constructor: function() {
            this.inherited(arguments);
            this.boxw = 18;
            var def1 = new Deferred();
            this.def = new Deferred();
            var thisB = this;
            var region = this.browser.view.visibleRegion();
            var ref;

            // use this promise chain to get original names of refseq in vcf
            this.store.getVCFHeader().then(function() {
                thisB.store.indexedData.getLines(
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
                            url: thisB.config.baseUrl + '/' + thisB.config.urlTemplate
                        };
                        request(thisB.config.ldviewer + '?' + ioQuery.objectToQuery(query)).then(function(res) {
                            thisB.results = thisB.parseResults(res);
                            def1.resolve();
                        }, function(error) {
                            console.error('error', error.message);
                            thisB.reject(error.message);
                        });
                    },
                    function(error) {
                        console.error('error', error);
                        thisB.reject(error);
                    }
                );
            }, function(error) {
                console.error('error', error);
                thisB.reject(error);
            });
            this.feats = {};

            def1.then(function() {
                thisB.store.getFeatures(region, function(feat) {
                    thisB.feats[feat.get('name')] = feat;
                }, function() {
                    thisB.def.resolve();
                }, function(error) {
                    thisB.reject(error);
                });
            });
        },
        _defaultConfig: function() {
            return Util.deepUpdate(lang.mixin(this.inherited(arguments), {
                style: {
                    height: 1000
                }
            }));
        },

        fillBlock: function(args) {
            args.finishCallback();
        },

        _canvasHeight: function() {
            return +((this.config.style || {}).height) || 200;
        },

        setViewInfo: function(genomeView, heightUpdate, numBlocks, trackDiv, widthPct, widthPx, scale) {
            this.inherited(arguments);
            this.staticCanvas = dom.create('canvas', { style: { cursor: 'default', position: 'absolute', zIndex: 15 }}, trackDiv);
        },

        updateStaticElements: function(coords) {
            this.inherited(arguments);

            if (coords.hasOwnProperty('x')) {
                var context = this.staticCanvas.getContext('2d');

                this.staticCanvas.width = this.browser.view.elem.clientWidth;
                this.staticCanvas.height = this._canvasHeight();
                this.staticCanvas.style.left = coords.x + 'px';
                context.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);

                var minVisible = this.browser.view.minVisible();
                var maxVisible = this.browser.view.maxVisible();
                var viewArgs = {
                    minVisible: minVisible,
                    maxVisible: maxVisible,
                    bpToPx: dojo.hitch(this.browser.view, 'bpToPx'),
                    lWidth: this.label.offsetWidth
                };
                this.heightUpdate(this._canvasHeight(), 0);
                this.initRender();
            }
        },
        initRender: function() {
            var thisB = this;
            this.def.then(function() {
                thisB.renderBox();
            }, function(error) {
                console.error(error);
            });
        },


        renderBox: function() {
            var c = this.staticCanvas;
            var ctx = c.getContext('2d');
            var scores = this.results.scores;
            var region = this.browser.view.visibleRegion();
            var snps = this.results.snps;
            var boxw = Math.min((c.width - 200) / snps.length, 18);
            var bw = boxw / Math.sqrt(2);
            var trans = (c.width / 2) - (snps.length * bw / 2);
            console.log(boxw);

            // render triangle rotated
            ctx.save();
            ctx.translate(trans, 80);
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
            ctx.restore();
            ctx.translate(trans, 40);

            // draw lines
            ctx.stokeStyle = 'black';
            for (var k = 0; k < snps.length; k++) {
                var snp = snps[k];
                var feat = this.feats[snp];
                if (feat) {
                    var pos = (feat.get('start') - region.start) * c.width / (region.end - region.start) - trans;
                    ctx.beginPath();
                    ctx.moveTo(k * boxw + bw - 3, 30);
                    ctx.lineTo(pos - 3, 0);
                    ctx.stroke();
                }
            }
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
        }
    });
});

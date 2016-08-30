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
            this.redrawView = true;
            this.getLD();
        },

        getLD: function() {
            var ref;
            var thisB = this;
            var def1 = new Deferred();
            this.def = new Deferred();
            var region = this.browser.view.visibleRegion();

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
                            url: thisB.config.baseUrl + '/' + thisB.config.urlTemplate,
                            maf: thisB.config.maf
                        };
                        request(thisB.config.ldviewer + '?' + ioQuery.objectToQuery(query)).then(function(res) {
                            thisB.results = thisB.parseResults(res);
                            def1.resolve();
                        }, function(error) {
                            def1.reject(error.message);
                        });
                    },
                    function(error) {
                        def1.reject(error);
                    }
                );
            }, function(error) {
                def1.reject(error);
            });
            this.featStarts = {};

            def1.then(function() {
                thisB.store.getFeatures(region, function(feat) {
                    thisB.featStarts[feat.get('name')] = feat.get('start');
                }, function() {
                    thisB.def.resolve();
                }, function(error) {
                    thisB.def.reject(error);
                    this.fatalError = error;
                    console.error(error);
                });
            });
        },

        fillBlock: function(args) {
            var thisB = this;
            this.def.then(function() {
                thisB.heightUpdate(thisB._canvasHeight(), args.blockIndex);
                args.finishCallback();
            });
        },

        _canvasHeight: function() {
            return +((this.config.style || {}).height) || 520;
        },

        _trackMenuOptions: function() {
            var opts = this.inherited(arguments);
            var thisB = this;
            opts.push({
                label: 'Refresh LD',
                onClick: function() {
                    thisB.redrawView = true;
                    thisB.getLD();
                    thisB.redraw();
                }
            });

            return opts;
        },

        setViewInfo: function(genomeView, heightUpdate, numBlocks, trackDiv) {
            this.inherited(arguments);
            this.staticCanvas = dom.create('canvas', { style: { cursor: 'default', position: 'absolute', zIndex: 15 }}, trackDiv);
        },

        updateStaticElements: function(coords) {
            this.inherited(arguments);

            if (coords.hasOwnProperty('x') && this.redrawView) {
                this.redrawView = false;
                var c = this.staticCanvas;
                var context = c.getContext('2d');

                c.width = this.browser.view.elem.clientWidth;
                c.height = this._canvasHeight();
                c.style.left = coords.x + 'px';
                this.oldW = c.width;

                var ratio = Util.getResolution(context, this.browser.config.highResolutionMode);
                if (this.browser.config.highResolutionMode !== 'disabled' && ratio >= 1) {
                    var oldWidth = c.width;
                    var oldHeight = c.height;

                    c.width = Math.round(oldWidth * ratio);
                    c.height = Math.round(oldHeight * ratio);

                    c.style.width = oldWidth + 'px';
                    c.style.height = oldHeight + 'px';
                    context.scale(ratio, ratio);
                }
                
                context.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);

                this.heightUpdate(this._canvasHeight(), 0);
                this.initRender(true, this.oldW);
            }
            else if(coords.hasOwnProperty('x')) {
                var context = this.staticCanvas.getContext('2d');

                this.staticCanvas.style.left = coords.x + 'px';
                context.clearRect(0, 0, this.staticCanvas.width, 80);

                this.heightUpdate(this._canvasHeight(), 0);
                this.initRender(false, this.oldW);
            }
        },
        initRender: function(allData, w) {
            var thisB = this;
            this.def.then(function() {
                thisB.renderBox(allData, w);
            }, function(error) {
                console.error(error);
                thisB.fatalError = error.message;
            });
        },


        renderBox: function(allData, w) {
            var c = this.staticCanvas;
            var ctx = c.getContext('2d');
            var scores = this.results.scores;
            var region = this.browser.view.visibleRegion();
            var snps = this.results.snps;
            var boxw = Math.min((w - 200) / snps.length, 18);
            var bw = boxw / Math.sqrt(2);
            var trans = (w / 2) - (snps.length * boxw / 2);

            if(allData) {
                // render triangle rotated
                ctx.save();
                ctx.translate(trans, 90);
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
            }

            // draw lines
            ctx.save();
            ctx.translate(trans, 40);

            ctx.stokeStyle = 'black';
            for (var k = 0; k < snps.length; k++) {
                var snp = snps[k];
                var featStart = this.featStarts[snp];
                if (featStart) {
                    var pos = (featStart - region.start) * w / (region.end - region.start) - trans;
                    ctx.beginPath();
                    ctx.moveTo(k * boxw + bw - 3, 30);
                    ctx.lineTo(pos - 3, 0);
                    ctx.stroke();
                }
            }
            ctx.restore();
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

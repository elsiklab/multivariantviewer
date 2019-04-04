define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/request',
    'dojo/dom-construct',
    'dojo/io-query',
    'JBrowse/View/Track/BlockBased',
    'JBrowse/Util',
    'dojo/Deferred',
    'dojo/promise/all'
],
function (
    declare,
    array,
    lang,
    request,
    dom,
    ioQuery,
    BlockBased,
    Util,
    Deferred,
    all
) {
    return declare(BlockBased, {
        constructor: function () {
            this.redrawView = true;
            this.getLD();
        },

        getLD: function () {
            var ref;
            var thisB = this;
            this.featStarts = {};
            this.def = new Deferred();
            var region;
            var disposer = setInterval(function () {
                region = thisB.browser.view.visibleRegion();
                if (!region.start && !region.end) { return; }
                clearInterval(disposer);
                var ret = thisB.store.getVCFHeader || thisB.store.getParser;
                var d1 = ret.call(thisB.store).then(function () {
                    var d = new Deferred();
                    thisB.store.getFeatures(
                        region,
                        function (line) {
                            ref = line.get('seq_id');
                        },
                        function (res) {
                            d.resolve(res);
                        },
                        function (error) {
                            d.reject(error);
                        }
                    );
                    return d;
                }).then(function () {
                    var query = {
                        ref: ref,
                        start: region.start,
                        end: region.end,
                        url: thisB.config.baseUrl + '/' + thisB.config.urlTemplate,
                        maf: thisB.config.maf
                    };
                    var d = new Deferred();
                    request(thisB.config.ldviewer + '?' + ioQuery.objectToQuery(query)).then(function (res) {
                        thisB.results = thisB.parseResults(res);
                        d.resolve();
                    }, function (error) {
                        d.reject(error);
                    });
                    return d;
                });


                var d2 = new Deferred();
                thisB.store.getFeatures(region, function (feat) {
                    thisB.featStarts[feat.get('name')] = feat.get('start');
                }, function (res) {
                    d2.resolve(res);
                }, function (error) {
                    d2.reject(error);
                });


                all([d1, d2]).then(function () {
                    thisB.def.resolve(true);
                });
            }, 100);
        },

        fillBlock: function (args) {
            var thisB = this;
            this.def.then(function () {
                thisB.heightUpdate(thisB._canvasHeight(), args.blockIndex);
                args.finishCallback();
            }, function (error) {
                console.error(error);
                thisB.fatalError = error;
                thisB.redraw();
            });
        },

        _canvasHeight: function () {
            return +((this.config.style || {}).height) || 520;
        },

        _trackMenuOptions: function () {
            var opts = this.inherited(arguments);
            var thisB = this;
            opts.push({
                label: 'Refresh LD',
                onClick: function () {
                    thisB.redrawView = true;
                    thisB.getLD();
                    thisB.redraw();
                }
            });

            return opts;
        },

        setViewInfo: function (genomeView, heightUpdate, numBlocks, trackDiv) {
            this.inherited(arguments);
            this.staticCanvas = dom.create('canvas', { style: { cursor: 'default', position: 'absolute', zIndex: 15 }}, trackDiv);
        },

        updateStaticElements: function (coords) {
            this.inherited(arguments);
            var thisB = this;

            this.def.then(function () {
                if (coords.hasOwnProperty('x') && thisB.redrawView) {
                    thisB.redrawView = false;
                    var c = thisB.staticCanvas;
                    var context = c.getContext('2d');

                    c.width = thisB.browser.view.elem.clientWidth;
                    c.height = thisB._canvasHeight();
                    c.style.left = coords.x + 'px';
                    thisB.oldW = c.width;

                    var ratio = Util.getResolution(context, thisB.browser.config.highResolutionMode);
                    if (thisB.browser.config.highResolutionMode !== 'disabled' && ratio >= 1) {
                        var oldWidth = c.width;
                        var oldHeight = c.height;

                        c.width = Math.round(oldWidth * ratio);
                        c.height = Math.round(oldHeight * ratio);

                        c.style.width = oldWidth + 'px';
                        c.style.height = oldHeight + 'px';
                        context.scale(ratio, ratio);
                    }

                    context.clearRect(0, 0, c.width, c.height);

                    thisB.heightUpdate(thisB._canvasHeight(), 0);
                    thisB.renderBox(true, thisB.oldW);
                } else if (coords.hasOwnProperty('x')) {
                    var c = thisB.staticCanvas;
                    var context = c.getContext('2d');

                    c.style.left = coords.x + 'px';
                    context.clearRect(0, 0, c.width, 80);

                    thisB.heightUpdate(thisB._canvasHeight(), 0);
                    thisB.renderBox(false, thisB.oldW);
                }
            }, function (error) {
                thisB.fatalError = error.message;
            });
        },

        renderBox: function (allData, w) {
            var c = this.staticCanvas;
            var ctx = c.getContext('2d');
            var scores = this.results.scores;
            var region = this.browser.view.visibleRegion();
            var snps = this.results.snps;
            var boxw = Math.min((w - 200) / snps.length, 18);
            var bw = boxw / Math.sqrt(2);
            var trans = (w / 2) - (snps.length * boxw / 2);

            if (allData) {
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

        parseResults: function (res) {
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

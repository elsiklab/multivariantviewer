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
            this.labels = {};

            if (this.config.sublabels) {
                this.config.sublabels.forEach(function(elt) {
                    this.labels[elt.name] = elt;
                }, this);
            }
            this.getVariants();
        },

        fillBlock: function(args) {
            var thisB = this;
            this.def.then(function() {
                thisB.heightUpdate(thisB._canvasHeight(), args.blockIndex);
            });
            args.finishCallback();
        },

        _canvasHeight: function() {
            var g = this.snps[0].get('genotypes');
            delete g.toString;

            return Object.keys(g).length * this.config.style.elt;
        },

        _defaultConfig: function() {
            return Util.deepUpdate(lang.mixin(this.inherited(arguments), {
                style: {
                    elt: 1
                }
            }));
        },

        setViewInfo: function(genomeView, heightUpdate, numBlocks, trackDiv) {
            this.inherited(arguments);
            this.staticCanvas = dom.create('canvas', { style: { cursor: 'default', position: 'absolute', zIndex: 15 }}, trackDiv);
        },

        updateStaticElements: function(coords) {
            var thisB = this;
            this.inherited(arguments);

            if (coords.hasOwnProperty('x') && !coords.hasOwnProperty('height')) {
                this.def.then(function() {
                    var context = thisB.staticCanvas.getContext('2d');

                    thisB.staticCanvas.width = thisB.browser.view.elem.clientWidth;
                    thisB.staticCanvas.height = thisB._canvasHeight();
                    thisB.staticCanvas.style.left = coords.x + 'px';
                    context.clearRect(0, 0, thisB.staticCanvas.width, thisB.staticCanvas.height);

                    thisB.renderBox();
                }, function(error) {
                    console.error(error);
                });
            }
        },


        getVariants: function() {
            var thisB = this;
            this.snps = [];
            this.def = new Deferred();
            var region = this.browser.view.visibleRegion();
            this.store.getFeatures(region, function(feat) {
                thisB.snps.push(feat);
            }, function() {
                thisB.def.resolve();
            }, function(error) {
                console.error(error);
                thisB.fatalError = error;
                thisB.def.reject(error);
            });
        },

        renderBox: function() {
            var c = this.staticCanvas;
            var ctx = c.getContext('2d');
            var region = this.browser.view.visibleRegion();
            var snps = this.snps;
            var boxw = (c.width - 200) / snps.length;
            var elt = this.config.style.elt;
            var bw = boxw / Math.sqrt(2);
            var trans = (c.width / 2) - (snps.length * boxw / 2);
            var thisB = this;


            // render triangle rotated
            ctx.save();


            ctx.translate(trans, 80);
            var g = snps[0].get('genotypes');
            delete g.toString;
            var keys = Object.keys(g);
            if (this.config.sortByPopulation) {
                keys.sort(function(a, b) { return thisB.labels[a.trim()].population.localeCompare(thisB.labels[b.trim()].population); });
            }
            for (var j = 0; j < snps.length; j++) {
                var snp = snps[j];
                var genotypes = snp.get('genotypes');
                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    var col;
                    if (genotypes[key].GT) {
                        var valueParse = genotypes[key].GT.values[0];
                        var splitter = (valueParse.match(/[\|\/]/g) || [])[0];
                        var split = valueParse.split(splitter);

                        if (+split[0] === +split[1] && split[0] !== '.' && +split[0] !== 0) {
                            col = 'blue';
                        } else if (+split[0] !== +split[1]) {
                            col = 'cyan';
                        } else {
                            col = '#aaa';
                        }
                    } else {
                        col = '#aaa';
                    }
                    ctx.fillStyle = col;
                    ctx.fillRect(j * boxw, i * elt, boxw + 0.6, boxw + 0.6);
                    ctx.fill();
                }
            }
            ctx.restore();

            ctx.save();
            ctx.translate(10, 80);
            if (this.config.sublabels) {
                for (var i = 0; i < keys.length; i++) {
                    var f = keys[i].trim();
                    ctx.fillStyle = this.labels[f].color;
                    ctx.fillRect(0, i * elt, 10, boxw + 0.6);
                }
            }
            ctx.restore();

            ctx.save();
            ctx.translate(trans, 40);
            // draw lines
            ctx.stokeStyle = 'black';
            for (var k = 0; k < snps.length; k++) {
                var snp = snps[k];
                var pos = (snp.get('start') - region.start) * c.width / (region.end - region.start) - trans;
                ctx.beginPath();
                ctx.moveTo(k * boxw + bw - 3, 30);
                ctx.lineTo(pos - 3, 0);
                ctx.stroke();
            }
            ctx.restore();
        },

        _trackMenuOptions: function() {
            var opts = this.inherited(arguments);
            var thisB = this;
            opts.push({
                label: 'Refresh matrix',
                onClick: function() {
                    thisB.getVariants();
                    thisB.redraw();
                }
            });

            return opts;
        }
    });
});

define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/request',
    'dojo/dom-construct',
    'dojo/io-query',
    'JBrowse/View/Track/BlockBased',
    'JBrowse/Util',
    'MultiVariantViewer/View/Track/_MultiVariantOptions',
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
    MultiVariantOptions,
    Deferred
) {
    return declare([BlockBased, MultiVariantOptions], {
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
            args.finishCallback();
        },

        _canvasHeight: function() {
            return +((this.config.style || {}).height) || 500;
        },

        _defaultConfig: function() {
            return Util.deepUpdate(lang.mixin(this.inherited(arguments), {
                style: {
                    matrixColor: function(feat, gt, gtString) {
                        if (gt === 'ref') {
                            return '#aaa';
                        } else if (!/^1([\|\/]1)*$/.test(gtString) && !/^0([\|\/]0)*$/.test(gtString)) {
                            return 'cyan';
                        }
                        return 'blue';
                    }
                },
                useMatrixViewer: true
            }));
        },
        _trackMenuOptions: function() {
            var opts = this.inherited(arguments);
            var thisB = this;
            opts.push({
                label: 'Refresh LD',
                onClick: function() {
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

            if (coords.hasOwnProperty('x') && !coords.hasOwnProperty('height')) {
                var context = this.staticCanvas.getContext('2d');

                this.staticCanvas.width = this.browser.view.elem.clientWidth;
                this.staticCanvas.height = this._canvasHeight();
                this.staticCanvas.style.left = coords.x + 'px';
                context.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);

                this.heightUpdate(this._canvasHeight(), 0);
                this.initRender();
                if (this.sublabels) {
                    var height = this.config.style.height + (this.config.style.offset || 0);
                    var len = this.sublabels.length;
                    array.forEach(this.sublabels, function(sublabel, i) {
                        sublabel.style.left = coords.x + 'px';
                        sublabel.style.top = i * height + 'px';
                        if (i === len - 1) {
                            dojo.addClass(sublabel, 'last');
                        }
                    });
                }
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
            var boxw = Math.min((c.width - 200) / snps.length, 18);
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
                keys.sort(function(a, b) { return thisB.track.labels[a.trim()].population.localeCompare(thisB.track.labels[b.trim()].population); });
            }
            for (var j = 0; j < snps.length; j++) {
                var snp = snps[j];
                var genotypes = snp.get('genotypes');
                var color = lang.hitch(this, 'getColor');
                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    var col;
                    if (genotypes[key].GT) {
                        var valueParse = genotypes[key].GT.values[0];
                        var splitter = (valueParse.match(/[\|\/]/g) || [])[0];
                        var split = valueParse.split(splitter);
                        if ((+split[0] !== 0   || +split[1] !== 0) && (split[0] !== '.' || split[1] !== '.')) {
                            col = color(snp, 'alt', valueParse);
                        } else {
                            col = color(snp, 'ref', valueParse);
                        }
                    } else {
                        col = color(snp, 'ref');
                    }
                    ctx.fillStyle = col;
                    ctx.fillRect(j * boxw, i * boxw, boxw + 0.6, boxw + 0.6);
                    ctx.fill();
                }
            }
            ctx.restore();
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
        },
        getColor: function(feature, genotype, genotypeFull) {
            return this.getConf('style.matrixColor', [feature, genotype, genotypeFull]);
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

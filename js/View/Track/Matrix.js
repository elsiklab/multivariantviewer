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
    'dojox/data/CsvStore'
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
    CsvStore
) {
    return declare(BlockBased, {
        constructor: function (args) {
            this.labels = {};
            this.redrawView = true;
            this.browser = args.browser;
            this.def = new Deferred();
            this.labelsCompleted = new Deferred();
            var thisB = this;
            if (this.config.sublabels) {
                this.config.sublabels.forEach(function (elt) {
                    this.labels[elt.name] = elt;
                }, this);
                this.labelsCompleted.resolve('success');
            } else if (this.config.sublabelsCsv) {
                var store = new CsvStore({url: Util.resolveUrl(thisB.config.baseUrl, this.config.sublabelsCsv) });
                store.fetch({
                    onComplete: function (items) {
                        for (var i = 0; i < items.length; i++) {
                            var name = store.getValue(items[i], 'name');
                            var population = store.getValue(items[i], 'population');
                            var color = store.getValue(items[i], 'color');
                            thisB.labels[name] = {name: name, color: color, population: population};
                        }
                        thisB.labelsCompleted.resolve('success');
                    }, onError: function () {
                        thisB.labelsCompleted.reject('error');
                    }
                });
            } else {
                this.labelsCompleted.resolve('success');
            }

            this.getVariants();
        },

        fillBlock: function (args) {
            var thisB = this;
            this.def.then(function () {
                thisB.heightUpdate(thisB._canvasHeight(), args.blockIndex);
            });
            args.finishCallback();
        },

        _canvasHeight: function () {
            if (this.snps[0]) {
                var g = this.snps[0].get('genotypes');
                delete g.toString;
                return Object.keys(g).length * (this.config.style.elt || this.config.style.height) + 80;
            }
            return 0;
        },

        _defaultConfig: function () {
            return Util.deepUpdate(lang.mixin(this.inherited(arguments), {
                style: {
                    height: 1,
                    ref_color: '#aaa',
                    hom_color: 'blue',
                    het_color: 'cyan',
                    no_call: 'white'
                }
            }));
        },

        setViewInfo: function (genomeView, heightUpdate, numBlocks, trackDiv) {
            this.inherited(arguments);
            this.staticCanvas = dom.create('canvas', { style: { cursor: 'default', position: 'absolute', zIndex: 15 }}, trackDiv);
        },

        updateStaticElements: function (coords) {
            var thisB = this;
            this.inherited(arguments);
            this.def.then(function () {
                if (coords.hasOwnProperty('x') && thisB.redrawView) {
                    thisB.redrawView = false;
                    var c = thisB.staticCanvas;
                    var context = c.getContext('2d');
                    var ratio = Util.getResolution(context, thisB.browser.config.highResolutionMode);

                    c.width = thisB.browser.view.elem.clientWidth;
                    c.height = thisB._canvasHeight();
                    c.style.left = coords.x + 'px';
                    this.oldW = c.width;

                    if (thisB.browser.config.highResolutionMode !== 'disabled' && ratio >= 1) {
                        var w = c.width;
                        var h = c.height;
                        this.oldW = w;

                        c.width = Math.round(w * ratio);
                        c.height = Math.round(h * ratio);

                        c.style.width = w + 'px';
                        c.style.height = h + 'px';

                        context.scale(ratio, ratio);
                    }
                    context.clearRect(0, 0, thisB.staticCanvas.width, thisB.staticCanvas.height);

                    thisB.renderBox(true, this.oldW);
                } else if (coords.hasOwnProperty('x')) {
                    var context = thisB.staticCanvas.getContext('2d');
                    thisB.staticCanvas.style.left = coords.x + 'px';

                    context.clearRect(0, 0, thisB.staticCanvas.width, 80);
                    thisB.renderBox(false, this.oldW);
                }
            });
        },


        getVariants: function () {
            var thisB = this;
            this.snps = [];
            this.labelsCompleted.then(function () {
                setTimeout(function() {
                    var region = thisB.browser.view.visibleRegion();
                    if(!region.start && !region.end) { return }
                    thisB.store.getFeatures(region, function (feat) {
                        thisB.snps.push(feat);
                    }, function () {
                        thisB.def.resolve();
                    }, function (error) {
                        console.error(error);
                        thisB.fatalError = error;
                        thisB.def.reject(error);
                    });
                },1000)
            });
        },

        renderBox: function (allData, w /* , h */) {
            var thisB = this;
            this.labelsCompleted.then(function () {
                var c = thisB.staticCanvas;
                var ctx = c.getContext('2d');
                var region = thisB.browser.view.visibleRegion();
                if(!region.start && !region.end) return
                var snps = thisB.snps;
                var boxw = (w - 200) / snps.length;
                var elt = thisB.config.style.elt || thisB.config.style.height;
                var bw = boxw / Math.sqrt(2);
                var trans = (w / 2) - (snps.length * boxw / 2);
                if (allData) {
                    ctx.save();
                    ctx.translate(trans, 80);
                    if (!snps[0]) {
                        return;
                    }
                    var g = snps[0].get('genotypes');
                    delete g.toString;
                    var keys = Object.keys(g);
                    if (thisB.config.sortByPopulation) {
                        keys.sort(function (a, b) { return thisB.labels[a.trim()].population.localeCompare(thisB.labels[b.trim()].population); });
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
                                if (!splitter) {
                                    if (valueParse === '.') {
                                        col = thisB.config.style.no_call;
                                    } else if (valueParse === '0') {
                                        col = thisB.config.style.ref_color;
                                    } else {
                                        col = thisB.config.style.hom_color;
                                    }
                                } else if (splitter) {
                                    if (split[0] === '.') {
                                        col = thisB.config.style.no_call;
                                    } else if (+split[0] === +split[1] && +split[0] !== 0) {
                                        col = thisB.config.style.hom_color;
                                    } else if (+split[0] !== +split[1]) {
                                        col = thisB.config.style.het_color;
                                    } else {
                                        col = thisB.config.style.ref_color;
                                    }
                                }
                            } else {
                                col = thisB.config.style.ref_color;
                            }
                            ctx.fillStyle = col;
                            ctx.fillRect(j * boxw, i * elt, boxw + 0.6, elt + 0.6);
                            ctx.fill();
                        }
                    }
                    ctx.restore();

                    ctx.save();
                    ctx.translate(10, 80);
                    if (thisB.labels) {
                        for (var i = 0; i < keys.length; i++) {
                            var f = keys[i].trim();
                            ctx.fillStyle = (thisB.labels[f]||{}).color;
                            ctx.fillRect(0, i * elt, 10, elt + 0.6);
                        }
                    }
                    ctx.restore();
                }

                // draw lines connecting variants to feats
                ctx.save();
                ctx.translate(trans, 40);
                ctx.stokeStyle = 'black';
                for (var k = 0; k < snps.length; k++) {
                    var snp = snps[k];
                    var pos = (snp.get('start') - region.start) * w / (region.end - region.start) - trans;
                    ctx.beginPath();
                    ctx.moveTo(k * boxw + bw - 3, 30);
                    ctx.lineTo(pos - 3, 0);
                    ctx.stroke();
                }
                ctx.restore();
            });
        },
        makeTrackLabel: function () {
            var thisB = this;
            var c = this.config;

            if (c.showLabels || c.showTooltips) {
                this.labelsCompleted.then(function () {
                    var ret = thisB.store.getVCFHeader||thisB.store.getParser
                    ret.call(thisB.store).then(function (header) {
                        var keys = dojo.clone(header.samples);
                        if (c.sortByPopulation) {
                            keys.sort(function (a, b) { var r = thisB.labels; return r[a.trim()].population.localeCompare(r[b.trim()].population); });
                        } else if (c.sortBySublabels) {
                            keys = thisB.config.sublabels.map(function (r) { return r.name; });
                        }
                        thisB.keyorder = dojo.clone(keys);
                        thisB.sublabels = array.map(keys, function (sample) {
                            var key = sample.trim();
                            var elt = thisB.labels[key] || {};
                            var width = c.labelWidth ? c.labelWidth + 'px' : null;
                            var htmlnode = dojo.create('div', {
                                className: 'varianttrack-sublabel',
                                id: thisB.config.label + '_' + key,
                                style: {
                                    position: 'absolute',
                                    height: c.style.height - 1 + 'px',
                                    width: c.showLabels ? width : '10px',
                                    font: c.labelFont,
                                    backgroundColor: elt.color
                                },
                                innerHTML: c.showLabels ? key : ''
                            }, thisB.div);

                            on(htmlnode, c.clickTooltips ? 'click' : 'mouseover', function () {
                                Tooltip.show(key + '<br />' + (elt.description || '') + '<br />' + (elt.population || ''), htmlnode);
                            });
                            on(htmlnode, 'mouseleave', function () {
                                Tooltip.hide(htmlnode);
                            });


                            return htmlnode;
                        });
                    });
                });
            }

            this.inherited(arguments);
        },
        _trackMenuOptions: function () {
            var opts = this.inherited(arguments);
            var thisB = this;
            opts.push({
                label: 'Refresh matrix',
                onClick: function () {
                    thisB.def = new Deferred();
                    thisB.redrawView = true;
                    thisB.getVariants();
                    thisB.redraw();
                }
            });
            if (this.config.sublabels && this.config.sublabels[0].population) {
                opts.push({
                    label: 'Sort by population',
                    checked: !!thisB.config.sortByPopulation,
                    onClick: function () {
                        thisB.config.sortByPopulation = !thisB.config.sortByPopulation;
                        thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
                    }
                });
            }

            return opts;
        }
    });
});

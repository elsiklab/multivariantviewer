define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/on',
    'JBrowse/View/Track/CanvasFeatures',
    'JBrowse/View/Track/BlockBased',
    'JBrowse/Util',
    'dijit/Tooltip'
],
function (
    declare,
    array,
    lang,
    on,
    CanvasFeatures,
    BlockBased,
    Util,
    Tooltip
) {
    return declare(CanvasFeatures, {
        constructor: function () {
            this.labels = {};
            if (this.config.sublabels) {
                this.config.sublabels.forEach(function (elt) {
                    this.labels[elt.name] = elt;
                }, this);
            }
        },

        _defaultConfig: function () {
            return Util.deepUpdate(lang.clone(this.inherited(arguments)), {
                glyph: 'MultiVariantViewer/View/FeatureGlyph/Variant',
                showLabels: true,
                showTooltips: true,
                style: {
                    height: 12,
                    ref_color: '#aaa',
                    het_color: 'cyan',
                    hom_color: 'blue',
                    no_call: 'white',
                    matrixColor: function (feat, gt, gtString) {
                        if (gt === 'nocall') {
                            return 'white';
                        }
                        if (gt === 'ref') {
                            return '#aaa';
                        } else if (!/^1([\|\/]1)*$/.test(gtString) && !/^0([\|\/]0)*$/.test(gtString)) {
                            return 'cyan';
                        }
                        return 'blue';
                    }
                }
            });
        },

        // override getLayout to access addRect method
        _getLayout: function () {
            var thisB = this;
            var layout = this.inherited(arguments);
            return declare.safeMixin(layout, {
                getTotalHeight: function () {
                    return thisB.totalHeight;
                }
            });
        },

        makeTrackLabel: function () {
            var thisB = this;
            var c = this.config;

            if (c.showLabels || c.showTooltips) {
                this.store.getVCFHeader().then(function (header) {
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
            }

            this.inherited(arguments);
        },

        updateStaticElements: function (coords) {
            BlockBased.prototype.updateStaticElements.apply(this, arguments);
            if (this.sublabels && 'x' in coords) {
                var height = this.config.style.height + (this.config.style.offset || 0);
                var len = this.sublabels.length;
                array.forEach(this.sublabels, function (sublabel, i) {
                    sublabel.style.left = coords.x + 'px';
                    sublabel.style.top = i * height + 'px';
                    if (i === len - 1) {
                        dojo.addClass(sublabel, 'last');
                    }
                });
            }
        },
        _trackMenuOptions: function () {
            var opts = this.inherited(arguments);
            var thisB = this;
            if (this.config.sublabels && this.config.sublabels[0].population) {
                opts.push({
                    label: 'Sort by population',
                    type: 'dijit/CheckedMenuItem',
                    checked: !!thisB.config.sortByPopulation,
                    onClick: function () {
                        thisB.config.sortByPopulation = !thisB.config.sortByPopulation;
                        thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
                        thisB.redraw();
                        thisB.makeTrackLabel();
                    }
                });
            }

            return opts;
        },
        fillBlock: function (args) {
            var thisB = this;
            this.store.getVCFHeader().then(function (header) {
                thisB.totalHeight = header.samples.length * (thisB.config.style.height + (thisB.config.style.offset || 0));
                thisB.heightUpdate(thisB.totalHeight, args.blockIndex);
            });
            this.inherited(arguments);
        },
        setViewInfo: function () {
            this.inherited(arguments);
            delete this.staticCanvas;
        },
        _connectEventHandlers: function () {
        },
        _attachMouseOverEvents: function () {
        }
    });
});

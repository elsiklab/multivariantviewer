define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'JBrowse/View/Track/CanvasFeatures',
    'JBrowse/Util',
    'dijit/Tooltip',
    'dojo/Deferred',
    'MultiVariantViewer/View/Dialog/_MultiVariantOptions'
],
function(
    declare,
    array,
    lang,
    CanvasFeatures,
    Util,
    Tooltip,
    Deferred,
    MultiVariantOptions
) {
    return declare([CanvasFeatures, MultiVariantOptions], {
        constructor: function() {
            this.labels = {};
            if (this.config.sublabels) {
                this.config.sublabels.forEach(function(elt) {
                    this.labels[elt.name] = elt;
                }, this);
            }
        },

        _defaultConfig: function() {
            return Util.deepUpdate(lang.clone(this.inherited(arguments)), {
                glyph: 'MultiVariantViewer/View/FeatureGlyph/Variant',
                style: {
                    height: 5,
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
            });
        },

        // override getLayout to access addRect method
        _getLayout: function() {
            var thisB = this;
            var layout = this.inherited(arguments);
            return declare.safeMixin(layout, {
                addRect: function(id, left, right, height, data) {
                    var ret = data.get('genotypes');
                    delete ret.toString;
                    this.pTotalHeight = Object.keys(ret).length / 4 * thisB.config.style.height;
                    return this.pTotalHeight;
                }
            });
        },

        makeTrackLabel: function() {
            var thisB = this;
            var c = this.config;

            if (c.showLabels || c.showTooltips) {
                this.store.getVCFHeader().then(function(header) {
                    var keys = header.samples;
                    if (thisB.config.sortByPopulation) {
                        keys.sort(function(a, b) { return thisB.labels[a.trim()].population.localeCompare(thisB.labels[b.trim()].population); });
                    }
                    thisB.sublabels = array.map(header.samples, function(sample) {
                        var key = sample.trim();
                        var elt = thisB.labels[key] || {};
                        var width = c.labelWidth ? c.labelWidth + 'px' : null;
                        var htmlnode = dojo.create('div', {
                            className: 'varianttrack-sublabel',
                            id: key,
                            style: {
                                position: 'absolute',
                                height: c.style.height - 1 + 'px',
                                width: c.showLabels ? width : '10px',
                                font: c.labelFont,
                                backgroundColor: elt.color
                            },
                            innerHTML: c.showLabels ? key : ''
                        }, thisB.div);
                        htmlnode.tooltip = new Tooltip({
                            connectId: key,
                            label: key + '<br />' + (elt.description || '') + '<br />' + (elt.population || ''),
                            showDelay: 0
                        });
                        return htmlnode;
                    });
                });
            }

            this.inherited(arguments);
        },

        updateStaticElements: function(coords) {
            this.inherited(arguments);
            if (this.sublabels && 'x' in coords) {
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
    });
});

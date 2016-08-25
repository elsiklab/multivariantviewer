define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'JBrowse/View/Track/CanvasFeatures',
    'JBrowse/Util',
    'dijit/Tooltip',
    'dojo/Deferred',
    'MultiVariantViewer/View/Dialog/VariantViewer'
],
function(
    declare,
    array,
    lang,
    CanvasFeatures,
    Util,
    Tooltip,
    Deferred,
    VariantDialog
) {
    return declare(CanvasFeatures, {
        constructor: function() {
            this.colors = {};
            array.forEach(this.config.labelColors, function(elt) {
                this.colors[elt.name] = elt.color;
            }, this);

            this.promiseHeight = new Deferred();
        },
        _defaultConfig: function() {
            return Util.deepUpdate(lang.clone(this.inherited(arguments)), {
                glyph: 'MultiVariantViewer/View/FeatureGlyph/Variant',
                style: {
                    color: function(feat, gt, gtString) {
                        if (gt === 'ref') {
                            return '#aaa';
                        } else if (!/^1([\|\/]1)*$/.test(gtString) && !/^0([\|\/]0)*$/.test(gtString)) {
                            return 'cyan';
                        }
                        return 'blue';
                    },
                    height: 5
                }
            });
        },

        // override getLayout to access addRect method
        _getLayout: function() {
            var thisB = this;
            var layout = this.inherited(arguments);
            return declare.safeMixin(layout, {
                addRect: function(id, left, right, height, data) {
                    this.pTotalHeight = Object.keys(data.get('genotypes')).length / 4 * thisB.config.style.height;
                    if (!thisB.promiseHeight.isResolved()) {
                        var ret = data.get('genotypes');
                        delete ret.toString;
                        thisB.promiseHeight.resolve(Object.keys(ret));
                    }
                    return this.pTotalHeight;
                }
            });
        },

        makeTrackLabel: function() {
            var thisB = this;

            this.promiseHeight.then(function(genotypes) {
                if (thisB.config.showLabels || thisB.config.showTooltips) {
                    thisB.sublabels = array.map(genotypes, function(pkey) {
                        var key = pkey.trim()
                        var width = thisB.config.labelWidth ? thisB.config.labelWidth + 'px' : null;
                        var elt = dojo.create('div', {
                            className: 'varianttrack-sublabel',
                            id: key,
                            style: {
                                position: 'absolute',
                                height: thisB.config.style.height - 1 + 'px',
                                width: thisB.config.showLabels ? width : '10px',
                                font: thisB.config.labelFont,
                                backgroundColor: thisB.colors[key]
                            },
                            innerHTML: thisB.config.showLabels ? key : ''
                        }, thisB.div);
                        elt.tooltip = new Tooltip({
                            connectId: key,
                            label: key,
                            showDelay: 0
                        });
                        return elt;
                    });
                }
            });

            this.inherited(arguments);
        },

        _trackMenuOptions: function() {
            var opts = this.inherited(arguments);
            var thisB = this;
            opts.push({
                label: 'MultiVariantViewer',
                title: 'View variants',
                onClick: function() {
                    new VariantDialog().show({ browser: thisB.browser, track: thisB });
                }
            });
            return opts;
        },

        updateStaticElements: function(coords) {
            this.inherited(arguments);
            if (this.sublabels && 'x' in coords) {
                var height = this.config.style.height + (this.config.style.offset || 0);
                var len = this.sublabels.length;
                array.forEach(this.sublabels, function(sublabel, i) {
                    sublabel.style.left = coords.x + 'px';
                    sublabel.style.top = i * height + 'px';
                    if(i == len-1) {
                        dojo.addClass(sublabel, "last");
                    }
                });
            }
        }
    });
});

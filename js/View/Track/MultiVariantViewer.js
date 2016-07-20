define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'JBrowse/View/Track/CanvasVariants',
    'JBrowse/Util',
    'dijit/Tooltip',
    'dojo/Deferred'
],
function(
    declare,
    array,
    lang,
    CanvasVariants,
    Util,
    Tooltip,
    Deferred
) {
    return declare(CanvasVariants, {
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
                    color: function(feat, gt, gtFull) { return gt == 'ref' ? 'blue' : 'orange'; },
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
            this.inherited(arguments);

            this.promiseHeight.then(function(genotypes) {
                if (thisB.config.showLabels || thisB.config.showTooltips) {
                    thisB.sublabels = array.map(genotypes, function(key) {
                        var elt = dojo.create('div', {
                            className: 'varianttrack-sublabel',
                            id: key,
                            style: {
                                position: 'absolute',
                                height: thisB.config.style.height - 1 + 'px',
                                width: thisB.config.showLabels ? (thisB.config.labelWidth ? thisB.config.labelWidth + 'px' : null) : '10px',
                                font: thisB.config.labelFont,
                                backgroundColor: thisB.colors[key],
                                zIndex: 18 // same as main track label
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
        },
        updateStaticElements: function(coords) {
            this.inherited(arguments);
            if (this.sublabels && 'x' in coords) {
                var height = this.config.style.height + (this.config.style.offset || 0);
                array.forEach(this.sublabels, function(sublabel, i) {
                    sublabel.style.left = coords.x + 'px';
                    sublabel.style.top = i * height + 'px';
                });
            }
        }
    });
});

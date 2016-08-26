define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'JBrowse/View/Track/CanvasFeatures',
    'JBrowse/Util',
    'dijit/Tooltip',
    'dojo/Deferred',
    'MultiVariantViewer/View/Dialog/VariantViewer',
    'MultiVariantViewer/View/Dialog/LDViewer'
],
function(
    declare,
    array,
    lang,
    CanvasFeatures,
    Util,
    Tooltip,
    Deferred,
    VariantDialog,
    LDDialog
) {
    return declare(CanvasFeatures, {
        constructor: function(args) {
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
                ldviewer: 'http://localhost:4730/',
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
                            label: key + '<br />' + (elt.description || ''),
                            showDelay: 0
                        });
                        return htmlnode;
                    });
                });
            }

            this.inherited(arguments);
        },

        _trackMenuOptions: function() {
            var opts = this.inherited(arguments);
            var thisB = this;
            var c = this.config;
            opts.push({
                label: 'View variant matrix',
                onClick: function() {
                    new VariantDialog().show({ browser: thisB.browser, track: thisB });
                }
            });

            if(c.useLDViewer) {
                opts.push({
                    label: 'View variant LD',
                    onClick: function() {
                        console.log(c.baseUrl + c.urlTemplate);
                        new LDDialog().show({ browser: thisB.browser, track: thisB, ldviewer: thisB.config.ldviewer, url: c.baseUrl + c.urlTemplate });
                    }
                });
            }
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
                    if (i === len - 1) {
                        dojo.addClass(sublabel, 'last');
                    }
                });
            }
        }
    });
});

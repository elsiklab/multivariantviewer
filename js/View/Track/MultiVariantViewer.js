define( [   
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/lang',
            'JBrowse/View/Track/CanvasVariants',
            'JBrowse/Util'
        ],
        function(
            declare,
            array,
            lang,
            CanvasVariants,
            Util
        ) {

var dojof = Util.dojof;

return declare( CanvasVariants,
{
    
    _defaultConfig: function () {
        return Util.deepUpdate(
            lang.clone( this.inherited(arguments) ),
            {
                "glyph": "MultiVariantViewer/View/FeatureGlyph/Variant",
                "style": {
                    "color": function(feat, gt, gt_full) { return gt=='ref'? 'blue': 'orange'; }
                }
            });
    },

    // override getLayout to access addRect method
    _getLayout: function () {
        var thisB = this;
        var layout = this.inherited(arguments);
        return declare.safeMixin(layout, {
            addRect: function (id, left, right, height, data) {
                this.pTotalHeight = dojof.keys( data.get('genotypes') ).length/2 * (thisB.config.style.spacer||thisB.config.style.height||2);
                return this.pTotalHeight;
            }
        });
    },

    makeTrackLabel: function() {
        var canvasHeight = this.config.style.height;
        var kheight = canvasHeight / (Object.keys(this.nameMap).length);

        this.inherited(arguments);
        if (this.config.showLabels || this.config.showTooltips) {
            this.sublabels = array.map(Object.keys(this.nameMap), function(key) {
                var elt = dojo.create('div', {
                    className: 'track-sublabel',
                    id: key,
                    style: {
                        position: 'absolute',
                        height: kheight + 'px',
                        width: this.config.showLabels ? (this.config.labelWidth ? this.config.labelWidth + 'px' : null) : '10px',
                        font: this.config.labelFont,
                        fontSize: this.config.labelFontSize,
                        backgroundColor: this.config.urlTemplates[this.nameMap[key]].color
                    },
                    innerHTML: this.config.showLabels ? key : ''
                }, this.div);
                elt.tooltip = new Tooltip({
                    connectId: key,
                    label: key,
                    showDelay: 0
                });

                return elt;
            }, this);
        }
    },
    updateStaticElements: function(/** Object*/ coords) {
        this.inherited(arguments);
        var height = this.config.style.height;
        if (this.sublabels && 'x' in coords) {
            var len = this.sublabels.length;
            array.forEach(this.sublabels, function(sublabel, i) {
                sublabel.style.left = coords.x + 'px';
                sublabel.style.top = i * height / len + 'px';
            }, this);
        }
    }
});
});

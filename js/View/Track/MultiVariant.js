define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'JBrowse/Util',
    'JBrowse/View/Track/CanvasFeatures',
    'MultiVariantViewer/View/Track/_MultiVariantOptions'
],
function(
    declare,
    lang,
    Util,
    CanvasFeatures,
    MultiVariantOptions
) {
    return declare([ CanvasFeatures, MultiVariantOptions ], {
        _defaultConfig: function() {
            return Util.deepUpdate(lang.clone(this.inherited(arguments)), {
                style: {
                    color: 'darkgreen',
                    matrixColor: function(feat, gt, gtString) {
                        if (gt === 'ref') {
                            return '#aaa';
                        } else if (!/^1([\|\/]1)*$/.test(gtString) && !/^0([\|\/]0)*$/.test(gtString)) {
                            return 'cyan';
                        }   
                        return 'blue';
                    }
                }
            });
        }
    });
});

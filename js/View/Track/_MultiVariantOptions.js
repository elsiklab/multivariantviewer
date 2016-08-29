define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'JBrowse/Util',
    'MultiVariantViewer/View/Dialog/VariantViewer',
    'MultiVariantViewer/View/Dialog/LDViewer'
],
function(
    declare,
    lang,
    Util,
    VariantDialog,
    LDDialog
) {
    return declare(null, {
        _trackMenuOptions: function() {
            var opts = this.inherited(arguments);
            var thisB = this;
            var c = this.config;
            if (c.useMatrixViewer) {
                opts.push({
                    label: 'View variant matrix',
                    onClick: function() {
                        new VariantDialog().show({ browser: thisB.browser, track: thisB });
                    }
                });
            }

            if (c.useLDViewer) {
                opts.push({
                    label: 'View variant LD',
                    onClick: function() {
                        new LDDialog().show({ browser: thisB.browser, track: thisB, ldviewer: thisB.config.ldviewer, url: c.baseUrl + c.urlTemplate });
                    }
                });
            }
            return opts;
        }
    });
});

define([
    'dojo/_base/declare',
    'MultiVariantViewer/View/Dialog/VariantViewer',
    'MultiVariantViewer/View/Dialog/LDViewer'
],
function(
    declare,
    VariantDialog,
    LDDialog
) {
    return declare(null, {
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
        }
    });
});

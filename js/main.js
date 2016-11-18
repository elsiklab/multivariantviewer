define([
    'dojo/_base/declare',
    'JBrowse/Plugin'
],
function (
    declare,
    JBrowsePlugin
) {
    return declare(JBrowsePlugin, {
        constructor: function (args) {
            var browser = args.browser;
            console.log('MultiVariantViewer plugin starting');
            browser.registerTrackType({
                label: 'MultiVariantViewer',
                type: 'MultiVariantViewer/View/Track/Grid'
            });
        }
    });
});

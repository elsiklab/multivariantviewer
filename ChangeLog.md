# Version 1.0.1

- Fix bug in the matrix glyph

# Version 1.0.0

- Add sublabelsCsv config to put sublabels in CSV file
- Support no-call properly. Thanks to @carrere and @srobb1 for pointing this out
- Fix refresh matrix function on matrix tracks

# Version 0.9.0

- Fix issue where genotypes were not paired to the sublabels properly. Thanks to @chcir for reporting.

# Version 0.8.0

- Fix issue with the track height not getting calculated properly in regions with no variants. #12
- Allow `includeIndels` option to render indels in the chart, which is disabled by default to avoid overlaps. #11


# Version 0.7.0

- Fixed tooltips not disappearing
- Added `ref_color`, `het_color`, and `hom_color` options to make it easier to style, matrixColor remains as backup
- Made height by default 12
- Made showLabels and showTooltips true by default
- Optimized the rendering somewhat

# Version 0.6.0

- Adds improved handling of haploid vcf. Thanks to @sravel for testing
- Fixes bug with the height of the track in the Matrix track type
- Fixes bug with the sort by population option. Thanks to @sravel for pointing out

# Version 0.5.0

- Remove TooltipDialog class due to conflicts with official jbrowse releases. Thanks to @carrere for reporting

# Version 0.4.0

- Added clickTooltips option

# Version 0.3.0

- Removed dialog boxes
- Improved LD track
- Added matrix track

# Version 0.2.0

- Plot LD and matrix in dialog boxes
- Experimental LD as a track
- Add option to open grid track to File->Open if user wants to view with their own VCF file
- Renamed track types, take note if upgrading

# Version 0.1.0

- Plot individuals from VCF with optional offset between them
- Added subtrack labels


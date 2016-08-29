var express = require('express');
var tmp = require('tmp-promise');
var fs = require('fs');
var child = require('child_process');
var app = express();

var settings = {
    plink: 'plink2', // can be full path
    tabix: 'tabix', // can be full path,
    deleteFiles: 1
};

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.get('/', function(req, res) {
    var ref = req.query.ref;
    var start = Math.round(req.query.start);
    var end = Math.round(req.query.end);
    var maf = req.query.maf || 0.01;
    var vcf = req.query.url;
    var proc = child.spawn(settings.tabix, ['-p', 'vcf', '-h', vcf, ref + ':' + start + '-' + end]);

    proc.stderr.on('data', function(data) {
        console.error(data.toString('utf8'));
    });
    var vcfname = tmp.tmpNameSync({ prefix: 'vcf' });
    var outputname = tmp.tmpNameSync({ prefix: 'plink' });
    var tabixvcf = fs.createWriteStream(vcfname, { flags: 'w' });
    proc.stdout.pipe(tabixvcf);
    proc.stderr.pipe(process.stderr);
    proc.on('exit', function() {
        var params = [ '--vcf', vcfname, '--r2', 'triangle', '--out', outputname, '--allow-extra-chr', '--write-snplist', '--maf', maf ];
        var p = child.spawn(settings.plink, params);
        p.stdout.pipe(process.stdout);
        p.stderr.pipe(process.stderr);
        p.on('exit', function() {
            res.send(fs.readFileSync(outputname + '.snplist') + '\nbreak\n' + fs.readFileSync(outputname + '.ld'));
            if (settings.deleteFiles) {
                fs.unlinkSync(vcfname);
                fs.unlinkSync(outputname + '.nosex');
                fs.unlinkSync(outputname + '.snplist');
                fs.unlinkSync(outputname + '.log');
                fs.unlinkSync(outputname + '.ld');
                if(settings.debug) {
                    console.log(vcfname, outputname + '.nosex', outputname + '.snplist', outputname + '.log', outputname + '.ld');
                }
            }
        });
    });
});

app.listen(process.env.EXPRESS_PORT || 4730);

from toolshed import nopen
import sys
import os
import glob
import tempfile

def main(args=sys.argv[1:]):
    region = args[0].replace("chr", "")
    chrom = "chr%s" % region.split(":")[0]

    ld_snp = args[1] if len(args) > 1 else None

    vcf = pull_vcf(chrom, region)
    for i, line in enumerate(open(gen_ld(vcf, ld_snp))):
        if i == 0: line = "#" + line.strip()
        print "\t".join(line.strip().split())
    os.unlink(vcf)
    for pf in glob.glob("%s.%s"):
        os.unlink(pf)

def gen_ld(vcf, ld_snp):
    print >>sys.stderr, "calculating LD..."
    out = tempfile.mktemp(suffix=".ld.txt")
    rs_list = tempfile.mktemp(suffix=".rs.txt")
    seen = {}
    with open(rs_list, "w") as fhrs:
        j = 0
        for toks in (line.rstrip().split("\t") for line in open(vcf)):
            if toks[0][0] == "#": continue
            if toks[2] in seen: continue
            seen[toks[2]] = True
            fhrs.write("%s\n" % toks[2])
            j += 1
        print >>sys.stderr, j, "SNPs"
    cmd = "|plink2 --vcf %s --ld-window-r2 0"
    cmd += " --out %s "
    if ld_snp is None:
        cmd += " --r2 inter-chr --ld-snp-list %s"
        cmd %= (vcf, out, rs_list)
    else:
        cmd += "--r2 --ld-snp %s "
        cmd %= (vcf, out, ld_snp)
    list(nopen(cmd))
    return out + ".ld"


def pull_vcf(chrom, region):
    print >>sys.stderr, "downloading with tabix"
    tmpvcf = tempfile.mktemp(suffix=".vcf")
    cmd = "|tabix -p vcf -h ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/release/20130502/ALL.%s.phase3_shapeit2_mvncall_integrated_v5a.20130502.genotypes.vcf.gz %s > %s" \
            % (chrom, region, tmpvcf)
    list(nopen(cmd))
    return tmpvcf


if __name__ == "__main__":
    main()

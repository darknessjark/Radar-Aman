// Official UAE domains: government, banks, utilities, telcos, airlines and couriers that scammers imitate.
// A link only counts as official when its real host IS one of these (or a subdomain of one).
// Mentioning a bank's name, or a domain that merely contains it, never counts.

// Every *.gov.ae host is a UAE government site.
const GOV_SUFFIXES = ["gov.ae"];

export const OFFICIAL_GROUPS = {
  government: [
    "u.ae", "government.ae", "tamm.abudhabi", "abudhabi.ae", "dubai.ae", "uaepass.ae", "icp.gov.ae", "adpolice.gov.ae",
    "dubaipolice.gov.ae", "moi.gov.ae", "mohre.gov.ae", "moec.gov.ae", "mof.gov.ae", "mofa.gov.ae", "adjd.gov.ae",
    "dc.gov.ae", "dm.gov.ae", "rta.ae", "itc.gov.ae", "salik.ae", "adcustoms.gov.ae", "dubaicustoms.gov.ae", "fca.gov.ae",
    "gdrfad.gov.ae", "zakat.ae", "tdra.gov.ae", "centralbank.ae", "sca.gov.ae", "adgm.com", "difc.ae", "dfsa.ae", "added.gov.ae",
    "ded.ae", "dubaided.gov.ae", "mawaqif.ae", "smartdubai.ae", "digitaldubai.ae", "emiratesid.ae", "wam.ae"
  ],
  banks: [
    "adcb.com", "bankfab.com", "emiratesnbd.com", "adib.ae", "dib.ae", "mashreq.com", "mashreqbank.com", "rakbank.ae", "cbd.ae",
    "emiratesislamic.ae", "sib.ae", "nbf.ae", "nbq.ae", "bankofsharjah.com", "investbank.ae", "ajmanbank.ae", "alhilalbank.ae",
    "uab.ae", "cbiuae.com", "eibank.com", "almasraf.ae", "wio.io", "zand.ae", "liv.me", "hsbc.ae", "citibank.ae", "sc.com",
    "arabbank.ae", "alansariexchange.com", "luluexchange.com", "alfardanexchange.com"
  ],
  utilities: ["dewa.gov.ae", "sewa.gov.ae", "addc.ae", "aadc.ae", "taqa.com", "etihadwe.ae", "adnoc.ae", "adnocdistribution.ae", "emarat.ae", "enoc.com"],
  telecom: ["etisalat.ae", "eand.com", "eand.ae", "du.ae"],
  transport: ["emiratespost.ae", "aramex.com", "dhl.com", "fedex.com", "ups.com", "emirates.com", "etihad.com", "flydubai.com", "airarabia.com", "dubaiairports.ae", "zayedinternationalairport.ae"]
};

export const OFFICIAL_DOMAINS = [...new Set(Object.values(OFFICIAL_GROUPS).flat())];

const host = x => String(x || "").toLowerCase().trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[\/?#:\s]/)[0].replace(/\.$/, "");

// The official domain a host belongs to, or null.
export function officialMatch(h) {
  const d = host(h);
  if (!d || !d.includes(".")) return null;
  if (GOV_SUFFIXES.some(s => d === s || d.endsWith("." + s))) return d.split(".").slice(-3).join(".");
  return OFFICIAL_DOMAINS.find(o => d === o || d.endsWith("." + o)) || null;
}
export const isOfficial = h => !!officialMatch(h);

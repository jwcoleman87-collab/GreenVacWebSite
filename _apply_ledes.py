"""One-off: replace location-page hero ledes with answer-first versions. Run once, delete."""
import os

P = 'class="lede-on-dark">'
PAIRS = {
 "locations/queanbeyan.html": (
   "GreenVac operates across Queanbeyan and the surrounding Palerang area. NSW side, no problem — the rig goes where the work is.",
   "Compact hydrovac in Queanbeyan and across the NSW border — NDD, potholing, trenching and pit cleaning, same service either side, no border surcharge. Call James on 0408 362 590."),
 "locations/gungahlin.html": (
   "New estates, tight residential blocks, and constant construction — GreenVac's compact rig handles NDD and potholing across all of Gungahlin's suburbs.",
   "Compact hydrovac across Gungahlin's newer estates — potholing and NDD to find services that aren't on every asset map yet, on tight blocks the big trucks can't reach. Call James on 0408 362 590."),
 "locations/belconnen.html": (
   "Belconnen's 1970s–80s infrastructure means older services at unexpected depths. GreenVac's compact rig exposes them safely before your crew digs.",
   "Compact hydrovac across Belconnen — NDD and potholing for the patchy 70s–80s service records that catch crews out, plus trenching and pit cleaning. Call James on 0408 362 590."),
 "locations/tuggeranong.html": (
   "Tuggeranong is the ACT district closest to GreenVac's Braidwood base — faster response times, established infrastructure, and rural fringe properties all in one area.",
   "Compact hydrovac across Tuggeranong, our closest ACT district to base — NDD, potholing, trenching and pit cleaning. Call James on 0408 362 590."),
 "locations/woden-valley.html": (
   "Government and hospital precincts, established residential suburbs, and the Phillip commercial district — GreenVac handles NDD and leak detection across all of Woden Valley.",
   "Compact hydrovac across Woden Valley — NDD, potholing and leak exposure for government, hospital and residential sites alike. Call James on 0408 362 590."),
 "locations/bungendore.html": (
   "Bungendore is growing fast — old infrastructure meets new estates, and utility records don't always keep up. GreenVac's NDD keeps your crew safe before any ground works.",
   "Compact hydrovac in Bungendore, under 30 minutes from base — NDD, potholing and trenching for town blocks, new estates and rural-residential properties. Call James on 0408 362 590."),
 "locations/goulburn.html": (
   "Goulburn's mix of older infrastructure and active industrial and commercial development makes NDD the essential choice before any significant ground works.",
   "Compact hydrovac in Goulburn — NDD, potholing, trenching, pit cleaning and leak support for residential, commercial and rural sites. Call James on 0408 362 590."),
 "locations/yass.html": (
   "Yass is growing fast on the Canberra fringe, but local hydrovac options are limited. GreenVac covers the Yass district — rural properties, new builds, and trade support.",
   "Compact hydrovac in Yass and district — NDD, potholing, trenching and pit/grid cleaning, from a Braidwood-based owner-operator. Call James on 0408 362 590."),
}

for rel, (old, new) in PAIRS.items():
    t = open(rel, encoding="utf-8").read()
    assert P + old in t, f"OLD lede not found in {rel}"
    t = t.replace(P + old, P + new)
    open(rel, "w", encoding="utf-8", newline="\n").write(t)
    print("updated", rel)
print("done")

# Photographs still needed from James

Two estimator options currently ship without a genuine photograph. Both are
usable as they stand, but a real photo would do the job better. Not deployed:
`*.md` is listed in `.vercelignore`.

---

## 1. A pit or drain being cleaned — **fallback in use**

**Where it appears:** "Pit or Drain Cleaning", inside More Job Types on step 1
(estimator step 1, expanded list). Also backs the pit size and pit fill
diagrams on step 2.

**Currently showing:** a branded SVG cross-section — a chamber with the lid
lifted off and a suction hose going in. It reads acceptably on desktop but it is
the weakest visual in the estimator at the 84px mobile thumbnail size.

**Why there is no photo:** the image previously used for this option,
`images/service-cleaning.jpg`, is actually a **cattle grid**, not a pit or drain.
It was never a match and has been removed from the option.

**What would work:** a pit, valve box or drainage pit with the lid off, mid
clean-out, ideally with the suction hose in frame. Landscape or square. Taken
from standing height looking down at maybe 45 degrees, so the chamber and the
surrounding ground are both visible.

**To wire it in** — drop the file in `images/`, then:

```bash
python make_estimator_images.py
```

Add a `thumb` entry for it in the `PLAN` dict in `make_estimator_images.py`, and
in `get-a-quote-src/src/App.jsx` change the `pit-cleanout` job from
`art: "pit"` to `photo: "<file-stem>"`.

---

## 2. A bore under a driveway or path — **closest match in use**

**Where it appears:** "Dig Under an Obstacle", inside More Job Types on step 1.

**Currently showing:** `images/hero-great-trenching.jpg` — excavation routed
around and under a house perimeter and its footings. It is a real GreenVac job
and it is honest, but it shows a perimeter dig rather than a bore *through* to
the other side of an obstacle.

**What would work:** a bore or tunnel run under a driveway, concrete path or
established tree, with both entry and exit pits visible if possible. That is the
thing customers are picturing when they choose this option.

---

## Not needed — these are correct

The three access photographs on step 3 were re-checked against their labels and
now match:

| Option | Photograph | Reads as |
| --- | --- | --- |
| Open Access | `port-03.jpg` | Flat open yard out to paddock, hose lying free |
| Narrow Access | `rig-access.jpg` | Hose threaded past a roller door, rig left on the street |
| Very Tight | `ndd-tight-access.jpg` | Worker wedged in a corridor between two walls |

The three primary job photographs (Non-Destructive Digging, Trenching,
Potholing) are unchanged from the originals and are good.

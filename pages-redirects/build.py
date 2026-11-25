import json
from pathlib import Path
import sys


ORIGIN = "https://www.mmilanta.com"
ROUTES = {
    "/": "/",
    "/aldebaran/": "/",
    "/boulder-grades/": "/boulder-grades/",
    "/cube-sphere/": "/cube-sphere/",
    "/deutsch/": "/",
    "/mmilanta/": "/",
    "/mnist/": "/mnist/",
    "/moonlit/": "/moonlit/",
    "/moonlit/method.html": "/moonlit/method.html",
    "/optimal-tennis-match/": "/optimal-tennis-match/",
    "/probability-calculator/": "/probability-calculator/",
    "/probable-spork/": "/probability-calculator/",
    "/probable-spork-web/": "/",
    "/probable-spork-web/dist/": "/",
    "/probable-spork-web/dist/optimal-tennis-match/": "/optimal-tennis-match/",
    "/probable-spork-web/dist/probability-calculator/": "/probability-calculator/",
    "/probable-spork-web/optimal-tennis-match/": "/optimal-tennis-match/",
    "/probable-spork-web/probability-calculator/": "/probability-calculator/",
    "/push-osc/": "/",
    "/stargaze-benchmark/": "/",
    "/starhopper/": "/starhopper/",
    "/vl-predictor/": "/vl-predictor/",
    "/404.html": "/",
}


def write_redirect(output, source, destination):
    path = output / source.lstrip("/")
    if source.endswith("/"):
        path /= "index.html"
    path.parent.mkdir(parents=True, exist_ok=True)
    target = ORIGIN + destination
    path.write_text(
        f"""<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Moved to mmilanta.com</title>
<link rel="canonical" href="{target}">
<script>
  window.location.replace({json.dumps(target)} + window.location.search + window.location.hash);
</script>
<meta http-equiv="refresh" content="0; url={target}">
<p>This page has moved. <a href="{target}">Continue to mmilanta.com</a>.</p>
</html>
""",
        encoding="utf-8",
    )


if __name__ == "__main__":
    output = Path(sys.argv[1])
    for source, destination in ROUTES.items():
        write_redirect(output, source, destination)

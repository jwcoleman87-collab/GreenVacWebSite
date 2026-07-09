#!/bin/sh
# GreenVac no-emoji guard.
#
# This repo has no git remote/checkout, so a .git/hooks/pre-commit hook can't be
# wired up. Instead the no-emoji rule is enforced two ways:
#   1. python deploy.py runs check_no_emoji.py as a gate and ABORTS the deploy
#      if any emoji is found (this is the real protection — nothing ships dirty).
#   2. This script, for running the check by hand at any time.
#
# Usage:  sh scripts/check-no-emoji.sh
# Exits non-zero (and lists every occurrence) if an emoji is found anywhere in
# the site's web assets. Hard rule: bespoke inline SVG or text only — never emoji.
exec python "$(dirname "$0")/../check_no_emoji.py"

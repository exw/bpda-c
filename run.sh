#!/bin/bash
mkdir -p under-construction
mkdir -p under-review
mkdir -p board-approved
rm */*/*.csv
cd under-construction
node ../index.js under-construction
cd ../under-review
node ../index.js under-review
cd ../board-approved
node ../index.js board-approved


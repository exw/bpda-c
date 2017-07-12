#!/bin/bash
mkdir -p under-construction
mkdir -p under-review
mkdir -p board-approved
rm *.csv
rm */*/*.csv
cd under-construction
pwd
node ../index.js under-construction
for file in ./*/*.csv
do
  mv "$file" "${file%.csv}-under-construction.csv"
done
cp */*.csv ..
cd ../under-review
pwd
node ../index.js under-review
for file in ./*/*.csv
do
  mv "$file" "${file%.csv}-under-review.csv"
done
cp */*.csv ..
cd ../board-approved
pwd
node ../index.js board-approved
for file in ./*/*.csv
do
  mv "$file" "${file%.csv}-board-approved.csv"
done
cp */*.csv ..

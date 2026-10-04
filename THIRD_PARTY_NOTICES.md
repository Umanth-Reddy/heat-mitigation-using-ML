# Third-party notices

## pythermalcomfort (UTCI polynomial)

`lib/thermal.ts` contains a TypeScript translation of the UTCI polynomial approximation from the
[pythermalcomfort](https://github.com/CenterForTheBuiltEnvironment/pythermalcomfort) package (`utci`, v4.6.0).
The coefficients are copied unchanged. pythermalcomfort is distributed under the MIT License; its copyright
notice follows.

```
MIT License

Copyright (c) 2019 Federico Tartarini

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice (including the next paragraph) shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

The polynomial itself is from Bröde, P., Fiala, D., Błażejczyk, K., et al. (2012), "Deriving the operational
procedure for the Universal Thermal Climate Index (UTCI)", Int. J. Biometeorol. 56, 481–494.
The validation values used by `scripts/test-thermal.mjs` come from the MIT-licensed
[validation-data-comfort-models](https://github.com/FedericoTartarini/validation-data-comfort-models) repository (v1.0.0).

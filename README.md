# Blogger çözüm motoru dosyaları

Bu klasördeki üç dosyayı GitHub deposunun kök dizinine yükleyin:

- `highs-loader.js`
- `type-solver.js`
- `highs.wasm`

Ardından [kelebek_v7.01.html](../kelebek_v7.01.html) içindeki
`SOLVER_ASSET_BASE_URL` değerini şu biçimde düzenleyin:

```js
const SOLVER_ASSET_BASE_URL =
  'https://cdn.jsdelivr.net/gh/GITHUB_KULLANICI_ADI/DEPO_ADI@main';
```

Dosyalar GitHub'a gönderildikten sonra jsDelivr bunları Blogger sayfasına
HTTPS üzerinden servis eder.

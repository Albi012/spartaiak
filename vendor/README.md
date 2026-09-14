# vendor/

Harmadik féltől származó, a repóba **bemásolt** fájlok. Azért vannak itt és
nem CDN-ről, mert az app offline is fut, és egy futásidejű `import()` külső
hosztról (korábban `esm.sh`) hármas gondot okozott:

1. **Offline törés** – bejelentkezve, háló nélkül a felhő-réteg el sem indult.
2. **Áruház-blokkoló** – az App Store és a Google Play natív burokban nem
   nézi jó szemmel a futásidőben letöltött kódot.
3. **Kiszolgáltatottság** – egy idegen CDN kiesése vagy megváltozása az app
   működését viszi magával.

## supabase.js

- Csomag: `@supabase/supabase-js`
- Verzió: **2.116.0**
- Forrás: `https://registry.npmjs.org/@supabase/supabase-js/-/supabase-js-2.116.0.tgz`
  → `package/dist/umd/supabase.js` (a hivatalos UMD build, változtatás nélkül)
- Licenc: MIT – lásd `LICENSE-supabase.txt`
- Globális név: `window.supabase` (UMD), innen jön a `createClient`.

### Frissítés

```sh
curl -O https://registry.npmjs.org/@supabase/supabase-js/-/supabase-js-<verzió>.tgz
tar xzf supabase-js-<verzió>.tgz
cp package/dist/umd/supabase.js  vendor/supabase.js
cp package/LICENSE               vendor/LICENSE-supabase.txt
```

Frissítés után **emeld a `sw.js` `VERSION`-jét** (az app-héj cache-e
ettől ürül), és írd át a verziószámot ebben a fájlban.

# Audit arsitektur dan keamanan - 29 Oktober 2026

Audit terhadap kondisi workspace saat ini, termasuk perubahan lokal yang sudah ada. Tidak melakukan deploy atau mengubah riwayat Git.

## Penilaian

Fondasi sudah baik untuk penambahan tools: route tipis, fitur memiliki UI dan logikanya sendiri, katalog tools terpusat, modul server/client terpisah, serta unit test dan smoke test tersedia. Belum tepat menyebut seluruh aplikasi sudah mengikuti semua best practice atau sepenuhnya aman. Perbaikan berikut menutup masalah konkret yang ditemukan; audit ini bukan penetration test terhadap layanan produksi.

## Temuan yang diperbaiki

| Prioritas | Temuan                                                                                                                                                                                 | Perbaikan                                                                                                                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1        | Regex pengguna dieksekusi di `useMemo` pada thread UI. Clock check setelah `exec()` tidak dapat menghentikan satu operasi yang macet, dan replacement juga tidak memiliki batas waktu. | Worker terpisah, debounce 150 ms, deadline 750 ms dari thread induk, terminasi saat input berubah/unmount, batas input, dan penolakan jika Worker tidak tersedia. Tidak ada fallback ke thread UI.      |
| P1        | Parser Markdown menjalankan replacement atas HTML yang sudah dihasilkan. Markdown pada URL/alt dapat menyisipkan markup hasil parser ke atribut dan merusak batas escaping.            | Tokenisasi source sebelum HTML, escaping berdasarkan konteks, pembatasan rekursi inline, dan tes regresi untuk atribut, URL, dan code span.                                                             |
| P1        | Diff Viewer mengalokasikan matriks LCS sebesar jumlah baris awal × jumlah baris akhir tanpa batas. Dua tampilan menghitung LCS yang sama dua kali.                                     | Batas gabungan 2.000.000 karakter, 10.000 baris total, dan 1.000.000 sel sebelum alokasi. Tampilan split diturunkan dari unified diff. Input terlalu besar menampilkan error dan menonaktifkan Compare. |
| P2        | Struktur shared components memiliki enam kategori dan belum memenuhi batas folder yang diminta.                                                                                        | Hanya `layout`, `ui`, `cummon`; folder tetap datar dan dijaga tes arsitektur. Semua import dan CSS terkait diperbarui.                                                                                  |
| P2        | Pola expiry notifikasi terduplikasi; timer pesan lama dapat menghapus pesan yang baru.                                                                                                 | `hooks/use-notice.ts` digunakan di delapan workspace, membatalkan timer sebelumnya dan membersihkannya saat unmount.                                                                                    |
| P2        | JSON normalization pada Diff Viewer menggunakan assignment property yang menghilangkan key `__proto__`.                                                                                | Property dibuat sebagai data melalui `Object.defineProperty`; tes memastikan key tetap utuh dan prototype global tidak berubah.                                                                         |
| P2        | Preview regex hanya bisa dibuka dengan klik, dan replacement input tidak memiliki accessible label.                                                                                    | Dukungan Enter/Space, fokus keyboard, label input, serta status feedback di beberapa workspace.                                                                                                         |
| P2        | CSP belum membatasi tujuan pengiriman form.                                                                                                                                            | Menambahkan `form-action 'self'`.                                                                                                                                                                       |

Perbaikan tambahan: zero-width regex dalam mode Unicode sekarang maju melewati surrogate pair tanpa duplikasi match.

## Struktur yang dipertahankan

```text
components/
  layout/    app shell, footer, global search
  ui/        ActionButton, Tooltip, CustomSelect, NumberInput, SegmentedTabs
  cummon/    ToolHeader, ToolContext, ToolIcon, logo, structured data
features/
  <slug>/    components, hooks, lib, styles khusus fitur
hooks/       perilaku bersama seperti useNotice
lib/         browser, format, SEO
config/      katalog tools, brand, site
```

Ejaan `cummon` sengaja mengikuti permintaan. Komponen yang hanya dimiliki satu fitur tetap di `features/<slug>/components/`. Memindahkan semua workspace ke shared components akan mencampur ownership dan memperbesar coupling. ESLint menjaga dependency shared/UI/common berdasarkan import alias; import relatif lintas batas tetap perlu diperhatikan saat review.

Komponen reusable yang sudah sesuai: ActionButton, CustomSelect, NumberInput, SegmentedTabs, Tooltip, ToolHeader, ToolContext, dan ToolIcon. Tidak perlu membuat satu komponen workspace dengan puluhan props untuk semua tools; ekstrak panel hanya bila struktur dan perilakunya benar-benar sama.

## Pekerjaan lanjutan untuk skala lebih besar

1. **CSS fitur masih global** (`app/globals.css`). Semua halaman menerima style dari tools lain. Migrasikan bertahap ke CSS Modules atau style per route sambil menguji cascade dan screenshot, terutama responsive rules yang saat ini dibagi bersama.
2. **Workspace besar masih menggabungkan beberapa tanggung jawab.** Image Compressor, Markdown Editor, SQL Formatter, dan Regex Tester dapat dipecah menjadi editor/panel/options yang dimiliki fitur masing-masing. Pisahkan state yang kompleks ke hook fitur; hindari mempromosikan komponen yang hanya dipakai sekali ke `cummon`.
3. **CSP produksi masih mengizinkan inline scripts/styles.** Nonce per request membutuhkan dynamic rendering menurut dokumentasi Next.js terpasang; proyek ini saat ini melakukan prerender dan juga menjalankan vinext. Tentukan strategi nonce/hash yang didukung kedua runtime sebelum menghapus `unsafe-inline`, lalu uji hydration dan bootstrap theme.
4. **Preview Markdown masih mendukung gambar eksternal.** `referrerpolicy="no-referrer"` ditambahkan, tetapi browser tetap menghubungi host gambar. Pertimbangkan opt-in untuk memuat gambar eksternal bila janji privasi ingin diperketat.
5. **Notes memakai localStorage tanpa enkripsi**, sebagaimana sudah dijelaskan dalam kebijakan aplikasi. Jangan menganggapnya penyimpanan kredensial yang aman. JWT Decoder hanya membaca token, bukan memverifikasi signature.
6. **Runtime lokal memakai Node 25.6.0**, sementara package menyatakan Node 24.22.x. Selaraskan local/CI/deployment agar hasil build konsisten. Tidak mengubah engine yang sudah ditetapkan dalam audit ini.

## Verifikasi

- ESLint dan TypeScript: lulus.
- Unit/integration tests: 133 lulus, termasuk worker thread asli untuk pola normal, catastrophic backtracking, dan cancellation; regresi Markdown; batas Diff; dan struktur components.
- Build Next.js dan Cloudflare/vinext: lulus. Cloudflare mengeluarkan warning sourcemap plugin dan klasifikasi route; build tetap selesai.
- Smoke test Next.js dan preview Cloudflare: masing-masing 24 halaman, security headers, dua redirect, robots, sitemap, 404, assets, dan social image lulus.
- Browser production Next.js: regex normal menghasilkan match, pola `(a+)+$` pada input berat terkena timeout, lalu pola normal dapat berjalan lagi.
- Browser preview Cloudflare: worker menghasilkan match normal; Diff Viewer menolak dua input 2.000 baris dengan pesan error dan Compare disabled.
- `npm audit`: 0 kerentanan dilaporkan saat pemeriksaan. Ini memeriksa advisory dependency, bukan bukti seluruh aplikasi bebas celah.

Acuan: panduan project structure, server/client components, dan CSP dari `node_modules/next/dist/docs/`; skill Vercel React Best Practices; [MDN Worker.terminate](https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate).

## Tindak lanjut - selesai pada 29 Oktober 2026

Item 1–3 pada daftar pekerjaan lanjutan di atas kini ditangani:

- Delapan belas stylesheet fitur menjadi CSS Modules, diimpor oleh entry component fitur. Scope lokal menjaga selector tetap di dalam fitur tanpa mengubah specificity. Responsive rules beranda dan Markdown mengikuti fitur pemiliknya. Style `ToolContext` dan logo menjadi modul komponen bersama; spinner tetap shared karena dipakai beberapa tools. Penggabungan CSS lintas fitur pada Next.js webpack dinonaktifkan melalui `experimental.cssChunking: false` agar route tidak menerima CSS tools lain. Ini menghasilkan lebih banyak stylesheet kecil dibanding penggabungan otomatis.
- Image Compressor memisahkan pengaturan ekspor dan perbandingan gambar; state konfigurasi ekspor menjadi satu objek bertipe `ExportSettings`. Markdown memakai toolbar berbasis data. Regex memisahkan editor pola dan daftar match. SQL memisahkan opsi dan syntax highlighting. Seluruh subkomponen tetap di fitur pemiliknya, sehingga `components/` masih hanya memiliki `layout`, `ui`, dan `cummon`.
- CSP skrip produksi memakai nonce acak per request dan `strict-dynamic`, tanpa `unsafe-inline` maupun `unsafe-eval`. Inline event handlers diblokir. Nonce klien ditimpa sebelum diteruskan ke renderer; script theme, JSON-LD, dan framework memakai nonce yang sama dengan response. HTML termasuk 404 memakai `private, no-store` dan render dinamis. Konsekuensinya, halaman HTML tidak lagi diprerender/cache statis; aset tetap dapat di-cache. `unsafe-inline` hanya dipertahankan untuk **style**, karena kontrol interaktif memakai atribut style dinamis.

Pemeriksaan tambahan tersedia dalam `scripts/check-security.mjs`: keunikan nonce antarrequest, penggantian header klien, cakupan nonce pada seluruh script, private/no-store untuk HTML dan 404, pemuatan CSS komponen bersama, serta pemisahan CSS fitur. Jalankan terhadap server Next.js dan preview Cloudflare setelah build.

Jumlah tes kini **136**. Browser memverifikasi batch tiga gambar, resize 50% menjadi 800 × 500, dan perbandingan gambar. Notes tetap localStorage tanpa enkripsi dan gambar Markdown eksternal tetap dapat dimuat; keduanya adalah batas produk yang belum diubah dalam tindak lanjut ini.

Verifikasi final tindak lanjut: lint dan typecheck bersih; 136 tes lulus; kedua build berhasil; smoke test masing-masing 24 halaman dan `test:security` lulus pada Next.js serta Cloudflare. Browser juga mengonfirmasi navigasi dari Regex ke Markdown, insertion Bold, persistensi tema setelah reload, dan output SQL setelah pemisahan komponennya.

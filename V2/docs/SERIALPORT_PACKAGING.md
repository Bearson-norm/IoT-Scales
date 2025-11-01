# Serialport Packaging untuk Executable

## Serialport Versi 12.x

Serialport versi 12.0.0 menggunakan arsitektur baru dengan:
- **Main package**: `serialport` (TypeScript, compiled ke dist/)
- **Native bindings**: `@serialport/bindings-cpp` (native module terpisah)
- **Stream wrapper**: `@serialport/stream`
- **Parsers**: `@serialport/parser-*`

## Struktur Dependencies

```
node_modules/
├── serialport/              # Main package
├── @serialport/
│   ├── bindings-cpp/        # Native bindings (penting!)
│   ├── stream/
│   └── parser-*/
```

## Copy Strategy untuk Executable

Saat mempackage dengan `pkg`, pastikan untuk copy:

1. **Serialport main module**: `node_modules/serialport`
2. **Scoped packages**: `node_modules/@serialport/*` (jika ada)
3. **Native bindings**: Akan otomatis ter-copy dalam folder bindings-cpp

## Verifikasi

Setelah build, cek struktur di `release/node_modules/`:

```
release/node_modules/
├── serialport/
│   ├── dist/
│   ├── package.json
│   └── ...
├── @serialport/          # Harus ada jika dependencies ter-flatten
│   └── bindings-cpp/
│       └── ...
```

## Troubleshooting

### Serialport tidak ditemukan saat runtime

**Penyebab**: Native bindings tidak ter-copy atau path resolution salah

**Solusi**:
1. Pastikan folder `@serialport` ter-copy jika ada
2. Pastikan executable mencari `node_modules` di path relatif ke executable
3. Cek `process.pkg` detection di server.js sudah aktif

### Native bindings tidak ditemukan

**Penyebab**: Dependencies ter-flatten atau belum terinstall

**Solusi**:
```bash
# Reinstall untuk memastikan semua dependencies terinstall
npm install serialport --force

# Rebuild native bindings
npm rebuild serialport

# Verify structure
dir /s /b node_modules\@serialport
```

## Catatan Penting

1. **Serialport 12.x** tidak selalu memiliki folder `build/Release/` seperti versi lama
2. Native bindings mungkin sudah pre-compiled atau menggunakan N-API yang berbeda
3. Yang penting adalah memastikan **semua dependencies ter-copy** ke release folder
4. Path resolution di `server.js` akan membantu menemukan modules saat runtime

## Alternative: Copy All node_modules

Jika masih ada masalah, opsi terakhir adalah copy semua node_modules:

```batch
REM Copy all node_modules (lebih besar tapi lebih aman)
xcopy /E /I /Y node_modules release\node_modules
```

Namun ini akan membuat package size lebih besar.



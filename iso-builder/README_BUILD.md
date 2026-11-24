# دليل بناء وتشغيل نظام KemetOS 1.0 (Debian 12 Bookworm ISO)

يحتوي مجلد `iso-builder/` على نظام البناء الكامل لتحويل مشروع **KemetOS 1.0** (واجهة React + محرك Rust/Tauri v2 + نواة Debian 12 Bookworm) إلى ملف **`KemetOS-1.0-amd64.iso`** حقيقي قابل للإقلاع والتثبيت على الأجهزة الحقيقية (ابتداءً من **1GB RAM**) مع دعم الإقلاع عبر **UEFI و Legacy BIOS**.

---

## 1. المتطلبات على جهاز البناء (Debian 12 / Ubuntu 22.04+ / WSL2)

```bash
sudo apt-get update
sudo apt-get install -y \
  debootstrap squashfs-tools xorriso mtools dosfstools \
  grub-pc-bin grub-efi-amd64-bin curl git nodejs npm \
  build-essential libwebkit2gtk-4.1-dev libgtk-3-dev \
  libayatana-appindicator3-dev librsvg2-dev libssl-dev
```

وتأكد من تثبيت **Rust & Cargo** لبناء حزمة Tauri التنفيذية (`.deb`):
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

---

## 2. بناء ملف الـ ISO بضغطة واحدة

من المجلد الرئيسي للمشروع:

```bash
chmod +x iso-builder/build-iso.sh iso-builder/nizamos-install.sh
sudo ./iso-builder/build-iso.sh
```

سيقوم السكربت تلقائياً بما يلي:
1. بناء واجهة React وحزمة `kemetos-desktop` بصيغة `.deb` عبر `npm install && npm run build && npm run tauri build`.
2. إنشاء بيئة **Debian 12 (Bookworm) amd64** خفيفة عبر `debootstrap`.
3. تثبيت نواة Linux + تعريفات الواي فاي وكروت الشاشة (`firmware-linux`, `firmware-linux-nonfree`, `firmware-iwlwifi`, `firmware-realtek`, `firmware-amd-graphics`) + `xorg` + `openbox` + `lightdm` + `webkit2gtk-4.1` + `network-manager` + `pulseaudio` + `zram-tools` + `chromium` + `wine`.
4. ضبط Openbox (`~/.config/openbox/autostart`) للإقلاع المباشر على واجهة **KemetOS 1.0** بدون أي شريط تقليدي.
5. إخراج الملف النهائي **`KemetOS-1.0-amd64.iso`** عبر `grub-mkrescue` بدعم UEFI و Legacy BIOS.

---

## 3. تجربة ملف الـ ISO على VirtualBox أو QEMU

### عبر QEMU:
```bash
qemu-system-x86_64 -m 2048 -smp 2 -enable-kvm -cdrom KemetOS-1.0-amd64.iso
```

### عبر VirtualBox:
1. أنشئ جهازاً جديداً بنوع **Linux -> Debian (64-bit)**.
2. خصص ذاكرة **1024 MB** فأكثر.
3. أرفق ملف **`KemetOS-1.0-amd64.iso`** في مشغل الأقراص الوهمي وشغّل الجهاز.

### بيانات الدخول في الجلسة المباشرة:
- **المستخدم**: `kemet` (تسجيل دخول تلقائي)
- **كلمة مرور `sudo`**: `1234`

---

## 4. الحرق على فلاشة USB للتشغيل على جهاز حقيقي

```bash
lsblk
sudo dd if=KemetOS-1.0-amd64.iso of=/dev/sdX bs=4M status=progress oflag=sync
```
*(استبدل `/dev/sdX` برمز الفلاشة الصحيح، أو استخدم أداة Rufus / BalenaEtcher على Windows).*

# بناء نسخة ISO قابلة للإقلاع والتثبيت من KemetOS 1.0
# Building a Bootable Live & Installable KemetOS 1.0 ISO

يحتوي مجلد `iso-builder/` على حزمة بناء متكاملة لتحويل واجهة **KemetOS 1.0 (Tauri v2 + React + Rust)** إلى ملف **ISO حقيقي** قابل للإقلاع من الفلاشة (USB) أو عبر أنظمة المحاكاة مثل QEMU / VirtualBox / VMware، مع دعم الإقلاع المباشر (Live Session) والتثبيت الدائم على القرص الصلب عبر مثبت **Calamares** الرسومي أو أداة **`kemetos-install`** النصية.

---

## 1. المتطلبات (Host Linux Prerequisites)
قم بتشغيل الخطوات التالية على توزيعة **Debian 12 / Ubuntu 22.04+** (معمارية `x86_64` / `amd64`):

```bash
sudo apt-get update
sudo apt-get install -y \
  debootstrap squashfs-tools xorriso mtools dosfstools \
  grub-pc-bin grub-efi-amd64-bin nodejs npm curl
```

وإذا كنت تريد حزم تطبيق Tauri في ملف `.deb` تلقائياً أثناء البناء، تأكد من تثبيت Rust وبيئة Tauri:
```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential libgtk-3-dev librsvg2-dev
```

---

## 2. بناء ملف الـ ISO (Build the Bootable ISO)
من المجلد الرئيسي للمشروع:

```bash
chmod +x iso-builder/build-iso.sh iso-builder/nizamos-install.sh
sudo ./iso-builder/build-iso.sh
```

عند الانتهاء سينتج ملف في المسار الرئيسي باسم:
`KemetOS-1.0-amd64.iso`

---

## 3. تجربة النظام قبل الحرق (Test in QEMU / VirtualBox)
يمكنك إقلاع النسخة فوراً في QEMU (UEFI أو BIOS):

```bash
qemu-system-x86_64 -m 2048 -smp 2 -enable-kvm -cdrom KemetOS-1.0-amd64.iso
```

بيانات الدخول الافتراضية في الجلسة المباشرة:
- **المستخدم**: `kemet`
- **كلمة المرور**: `1234`

---

---

## 4. تثبيت النظام على القرص الصلب (Permanent Installation)
داخل الجلسة المباشرة يمكنك التثبيت بطريقتين:
1. **المثبت الرسومي (Calamares)**: عبر تشغيل `sudo calamares` لاختيار اللغة والمنطقة الزمنية وتقسيم القرص.
2. **المثبت السريع بالطرفية (`kemetos-install`)**:
   ```bash
   sudo kemetos-install /dev/sda kemetos kemet
   ```

---

## 5. ميزات التوافق والأداء للعتاد الضعيف (4GB RAM & Low-Spec Optimization)
- **تعريفات العتاد الكاملة (Full Drivers Suite)**:
  - كروت الشاشة: `xserver-xorg-video-intel`, `xserver-xorg-video-amdgpu`, `xserver-xorg-video-all`, `mesa-utils`.
  - الصوت والشبكة: `pipewire`, `pipewire-pulse`, `wireplumber`, `network-manager`.
  - العتاد اللاسلكي والـ Firmware: `firmware-linux`, `firmware-linux-nonfree`, `firmware-misc-nonfree`.
- **ضغط الذاكرة الذكي (ZRAM Tools with zstd)**:
  - تفعيل `zramswap` تلقائياً بحجم 50% من الرامات مع خوارزمية ضغط `zstd` فائقة السرعة لضمان عمل النظام بسلاسة 60fps حتى على أجهزة Intel i3 ورامات 4GB دون أي اختناق.
- **التحقق الآلي بعد البناء (Post-Build Verification)**:
  - فحص وجود وأحجام `vmlinuz` و `initrd` و `filesystem.squashfs` وملف `.iso`.
  - إجراء اختبار إقلاع مصغر (Smoke test) عبر `qemu-system-x86_64` للتأكد من خلو ملف الـ ISO من أي Kernel Panic.

---

## محتويات المجلد (`iso-builder/`)
- `build-iso.sh`: سكريبت بناء Debian Bookworm + Xorg + Openbox + LightDM + PipeWire + NetworkManager + Wine + Plymouth + Calamares + ZRAM + SquashFS + GRUB UEFI/BIOS ISO.
- `nizamos-install.sh`: سكريبت تثبيت وتقسيم GPT/EFI/EXT4 وتنصيب GRUB على القرص الصلب.
- `config/nizamos.desktop`: ملف الجلسة `/usr/share/xsessions/nizamos.desktop`.
- `config/lightdm.conf`: إعداد تسجيل الدخول التلقائي لجلسة NizamOS.
- `config/os-release`: هوية النظام في `/etc/os-release`.
- `plymouth/`: شاشة الإقلاع الرسومية (Plymouth Splash Theme).
- `calamares/`: إعدادات وهوية مثبت النظام الرسومي Calamares.

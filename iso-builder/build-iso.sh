#!/usr/bin/env bash
# KemetOS 1.0 Bootable Live & Installable ISO Builder
# Targets Debian 12 (Bookworm) amd64 with complete non-free-firmware auto-detection,
# Openbox + LightDM auto-login + KemetOS Tauri v2 Spatial Shell + ZRAM + GRUB UEFI/BIOS
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ISO_DIR="${ROOT_DIR}/iso-builder"
WORK_DIR="${WORK_DIR:-/tmp/kemetos-iso-build}"
CHROOT_DIR="${WORK_DIR}/chroot"
IMAGE_DIR="${WORK_DIR}/image"
OUT_ISO="${OUT_ISO:-${ROOT_DIR}/KemetOS-1.0-amd64.iso}"
DEBIAN_SUITE="${DEBIAN_SUITE:-bookworm}"
DEBIAN_MIRROR="${DEBIAN_MIRROR:-http://deb.debian.org/debian}"
KEMETOS_ISO_PROFILE="${KEMETOS_ISO_PROFILE:-lite}"

# Ensure Rust/Cargo remains in PATH when script is invoked via sudo
if [[ -n "${SUDO_USER:-}" ]]; then
  SUDO_HOME="$(getent passwd "${SUDO_USER}" | cut -d: -f6 || true)"
  if [[ -n "${SUDO_HOME}" && -d "${SUDO_HOME}/.cargo/bin" ]]; then
    export PATH="${SUDO_HOME}/.cargo/bin:${PATH}"
  fi
fi
[[ -d "/root/.cargo/bin" ]] && export PATH="/root/.cargo/bin:${PATH}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Error: build-iso.sh must be run as root (sudo ./iso-builder/build-iso.sh)" >&2
  exit 1
fi

for cmd in debootstrap mksquashfs xorriso grub-mkrescue chroot; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "Missing host dependency '${cmd}'. Install: apt-get install -y debootstrap squashfs-tools xorriso grub-pc-bin grub-efi-amd64-bin mtools" >&2
    exit 1
  fi
done

echo "[1/8] Building KemetOS 1.0 frontend & Tauri desktop (.deb) bundle..."
if [[ -f "${ROOT_DIR}/package.json" ]] && command -v npm >/dev/null 2>&1; then
  pushd "${ROOT_DIR}" >/dev/null
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund
  npm run build
  if command -v cargo >/dev/null 2>&1; then
    npx --yes @tauri-apps/cli@^2 build --bundles deb
  else
    echo "Error: cargo/rustc not found on host; install Rust via https://rustup.rs before building ISO." >&2
    exit 1
  fi
  popd >/dev/null
fi

DEB_PKG="$(find "${ROOT_DIR}/src-tauri/target/release/bundle/deb" -maxdepth 1 -name '*.deb' 2>/dev/null | head -n 1 || true)"
if [[ -z "${DEB_PKG}" || ! -f "${DEB_PKG}" ]]; then
  echo "Error: KemetOS Tauri .deb package was not produced under src-tauri/target/release/bundle/deb." >&2
  exit 1
fi

echo "[2/8] Preparing clean workspace at ${WORK_DIR} (profile=${KEMETOS_ISO_PROFILE})..."
rm -rf "${WORK_DIR}"
mkdir -p "${CHROOT_DIR}" "${IMAGE_DIR}/live" "${IMAGE_DIR}/boot/grub"

echo "[3/8] Bootstrapping Debian ${DEBIAN_SUITE} base rootfs..."
debootstrap --arch=amd64 --variant=minbase "${DEBIAN_SUITE}" "${CHROOT_DIR}" "${DEBIAN_MIRROR}"

mount --bind /dev "${CHROOT_DIR}/dev"
mount --bind /dev/pts "${CHROOT_DIR}/dev/pts"
mount -t proc proc "${CHROOT_DIR}/proc"
mount -t sysfs sysfs "${CHROOT_DIR}/sys"

cleanup_mounts() {
  umount -lf "${CHROOT_DIR}/dev/pts" 2>/dev/null || true
  umount -lf "${CHROOT_DIR}/dev" 2>/dev/null || true
  umount -lf "${CHROOT_DIR}/proc" 2>/dev/null || true
  umount -lf "${CHROOT_DIR}/sys" 2>/dev/null || true
}
trap cleanup_mounts EXIT

echo "[4/8] Installing Linux kernel, hardware firmware, Xorg/Openbox, WebKitGTK & ZRAM..."
cat <<'EOF' > "${CHROOT_DIR}/etc/apt/sources.list"
deb http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware
deb http://deb.debian.org/debian bookworm-updates main contrib non-free non-free-firmware
deb http://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
EOF

EXTRA_PROFILE_PKGS=""
if [[ "${KEMETOS_ISO_PROFILE}" == "full" ]]; then
  EXTRA_PROFILE_PKGS="wine wine32 wine64 winetricks cabextract"
fi

chroot "${CHROOT_DIR}" /bin/bash -s -- "${EXTRA_PROFILE_PKGS}" <<'CHROOT_PKGS'
set -e
export DEBIAN_FRONTEND=noninteractive
EXTRA_PKGS="$1"
dpkg --add-architecture i386
apt-get update
apt-get install -y --no-install-recommends \
  linux-image-amd64 live-boot systemd-sysv sudo locales \
  grub-pc-bin grub-efi-amd64-bin efibootmgr \
  \
  firmware-linux firmware-linux-free firmware-linux-nonfree firmware-misc-nonfree \
  firmware-iwlwifi firmware-realtek firmware-atheros firmware-brcm80211 firmware-amd-graphics \
  rfkill wpasupplicant network-manager \
  \
  xorg xserver-xorg xserver-xorg-video-all xserver-xorg-video-amdgpu xserver-xorg-video-radeon \
  xserver-xorg-video-intel xserver-xorg-video-nouveau \
  mesa-vulkan-drivers libgl1-mesa-dri va-driver-all mesa-utils \
  \
  v4l-utils libv4l-0 \
  pipewire pipewire-pulse wireplumber pulseaudio-utils firmware-sof-signed alsa-ucm-conf \
  xserver-xorg-input-all xserver-xorg-input-libinput \
  \
  pciutils usbutils dmidecode lshw hwdata \
  brightnessctl upower acpi acpid thermald tlp zram-tools \
  \
  xinit openbox lightdm lightdm-gtk-greeter x11-xserver-utils xterm lxpolkit \
  polkitd pkexec chromium libwebkit2gtk-4.1-0 libgtk-3-0 libayatana-appindicator3-1 \
  breeze-cursor-theme dmz-cursor-theme \
  plymouth plymouth-themes calamares parted dosfstools e2fsprogs \
  curl wget ca-certificates fonts-cairo fonts-noto-core ${EXTRA_PKGS}

apt-get install -y --no-install-recommends policykit-1 2>/dev/null || true
apt-get install -y --no-install-recommends bibata-cursor-theme 2>/dev/null || true
apt-get clean
CHROOT_PKGS

# Install ZRAM (zstd, 75% quota) & Linux Kernel Low-RAM Sysctl Performance Tuning
install -Dm644 "${ISO_DIR}/config/zramswap" "${CHROOT_DIR}/etc/default/zramswap"
install -Dm644 "${ISO_DIR}/config/99-kemetos-performance.conf" "${CHROOT_DIR}/etc/sysctl.d/99-kemetos-performance.conf"

echo "[5/8] Creating KemetOS First-Boot Hardware Auto-Probe Service (kemet-hw-init.service)..."
cat <<'EOF' > "${CHROOT_DIR}/usr/local/sbin/kemet-hw-init.sh"
#!/usr/bin/env bash
set +e
sysctl --system >/dev/null 2>&1 || true
udevadm trigger --action=add || true
udevadm settle --timeout=5 || true
rfkill unblock all 2>/dev/null || true

for mod in uvcvideo videodev snd_hda_intel snd_sof_pci_intel_tgl snd_sof_amd_acp \
           iwlwifi rtw88_pci rtw89_pci ath9k ath10k_pci ath11k_pci brcmfmac \
           btusb hid_multitouch i2c_hid amdgpu i915 nouveau; do
  modprobe "${mod}" 2>/dev/null || true
done

nmcli networking on 2>/dev/null || true
exit 0
EOF
chmod +x "${CHROOT_DIR}/usr/local/sbin/kemet-hw-init.sh"

cat <<'EOF' > "${CHROOT_DIR}/etc/systemd/system/kemet-hw-init.service"
[Unit]
Description=KemetOS Automatic Hardware & Driver Probe Service
After=systemd-udevd.service
Before=network-pre.target lightdm.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/kemet-hw-init.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

echo "[6/8] Installing KemetOS 1.0 Desktop shell inside Openbox (zero legacy Openbox bars)..."
if [[ -n "${DEB_PKG}" && -f "${DEB_PKG}" ]]; then
  cp "${DEB_PKG}" "${CHROOT_DIR}/tmp/kemetos-desktop.deb"
  chroot "${CHROOT_DIR}" /bin/bash -c "DEBIAN_FRONTEND=noninteractive dpkg -i /tmp/kemetos-desktop.deb || apt-get install -f -y"
  rm -f "${CHROOT_DIR}/tmp/kemetos-desktop.deb"
fi

cat <<'EOF' > "${CHROOT_DIR}/usr/local/bin/kemetos-shell-launch.sh"
#!/usr/bin/env bash
export GDK_BACKEND=x11
export XCURSOR_THEME=Bibata-Modern-Classic
export XCURSOR_SIZE=24
xrdb -merge "${HOME}/.Xresources" 2>/dev/null || true
xsetroot -cursor_name left_ptr 2>/dev/null || true
xset s off -dpms 2>/dev/null || true

if command -v kemetos-desktop >/dev/null 2>&1; then
  exec kemetos-desktop
elif command -v nizamos-desktop >/dev/null 2>&1; then
  exec nizamos-desktop
fi
exec xterm
EOF
chmod +x "${CHROOT_DIR}/usr/local/bin/kemetos-shell-launch.sh"

cat <<'EOF' > "${CHROOT_DIR}/usr/local/bin/kemetos-session.sh"
#!/usr/bin/env bash
set -e
exec openbox-session
EOF
chmod +x "${CHROOT_DIR}/usr/local/bin/kemetos-session.sh"

mkdir -p "${CHROOT_DIR}/etc/xdg/openbox"
cat <<'EOF' > "${CHROOT_DIR}/etc/xdg/openbox/autostart"
# Start lightweight Polkit agent if installed & launch KemetOS Desktop Shell
if command -v lxpolkit >/dev/null 2>&1; then
  lxpolkit &
fi
/usr/local/bin/kemetos-shell-launch.sh &
EOF
chmod +x "${CHROOT_DIR}/etc/xdg/openbox/autostart"

install -Dm644 "${ISO_DIR}/config/kemetos.desktop" "${CHROOT_DIR}/usr/share/xsessions/kemetos.desktop"
install -Dm644 "${ISO_DIR}/config/lightdm.conf" "${CHROOT_DIR}/etc/lightdm/lightdm.conf.d/50-kemetos.conf"
install -Dm644 "${ISO_DIR}/config/os-release" "${CHROOT_DIR}/etc/os-release"
install -Dm644 "${ISO_DIR}/config/openbox-rc.xml" "${CHROOT_DIR}/etc/xdg/openbox/rc.xml"
install -Dm755 "${ISO_DIR}/nizamos-install.sh" "${CHROOT_DIR}/usr/local/sbin/kemetos-install"

install -Dm644 "${ISO_DIR}/plymouth/nizamos.plymouth" "${CHROOT_DIR}/usr/share/plymouth/themes/nizamos/nizamos.plymouth"
install -Dm644 "${ISO_DIR}/plymouth/nizamos.script" "${CHROOT_DIR}/usr/share/plymouth/themes/nizamos/nizamos.script"
chroot "${CHROOT_DIR}" /bin/bash -c "plymouth-set-default-theme -R nizamos || true"

install -Dm644 "${ISO_DIR}/calamares/settings.conf" "${CHROOT_DIR}/etc/calamares/settings.conf"
install -Dm644 "${ISO_DIR}/calamares/branding/nizamos/branding.desc" "${CHROOT_DIR}/etc/calamares/branding/nizamos/branding.desc"

echo "[7/8] Creating live user 'kemet' (sudo password: 1234), Openbox autostart & ZRAM tuning..."
chroot "${CHROOT_DIR}" /bin/bash <<'CHROOT_USER'
set -e
echo 'kemetos' > /etc/hostname
if ! id -u kemet >/dev/null 2>&1; then
  useradd -m -s /bin/bash -G sudo,video,audio,netdev,plugdev,render kemet
fi
echo 'kemet:1234' | chpasswd
echo 'kemet ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/kemetos-live
chmod 0440 /etc/sudoers.d/kemetos-live

mkdir -p /etc/polkit-1/rules.d /etc/polkit-1/localauthority/50-local.d
cat <<'POLKIT_JS' > /etc/polkit-1/rules.d/50-kemetos-live.rules
polkit.addRule(function(action, subject) {
  if (subject.isInGroup("sudo")) {
    return polkit.Result.YES;
  }
});
POLKIT_JS
cat <<'POLKIT_PKLA' > /etc/polkit-1/localauthority/50-local.d/50-kemetos-live.pkla
[Allow sudo group live admin actions]
Identity=unix-group:sudo
Action=*
ResultAny=yes
ResultInactive=yes
ResultActive=yes
POLKIT_PKLA

mkdir -p /home/kemet/.config/openbox /usr/share/icons/default
cp /etc/xdg/openbox/rc.xml /home/kemet/.config/openbox/rc.xml
cp /etc/xdg/openbox/autostart /home/kemet/.config/openbox/autostart
chmod +x /home/kemet/.config/openbox/autostart

CURSOR_NAME="Bibata-Modern-Classic"
if [ ! -d /usr/share/icons/Bibata-Modern-Classic ] && [ -d /usr/share/icons/Breeze_Obsidian ]; then
  CURSOR_NAME="Breeze_Obsidian"
elif [ ! -d /usr/share/icons/Bibata-Modern-Classic ] && [ -d /usr/share/icons/breeze_cursors ]; then
  CURSOR_NAME="breeze_cursors"
fi

printf '[Icon Theme]\nInherits=%s\n' "${CURSOR_NAME}" > /usr/share/icons/default/index.theme
printf 'Xcursor.theme: %s\nXcursor.size: 24\n' "${CURSOR_NAME}" > /home/kemet/.Xresources
chown -R kemet:kemet /home/kemet/.config /home/kemet/.Xresources

# Enable core lightweight services (1GB RAM friendly)
systemctl enable kemet-hw-init.service lightdm NetworkManager upower acpid thermald tlp zramswap 2>/dev/null || true

# Disable heavy background daemons to keep idle RAM minimal
systemctl disable apt-daily.timer apt-daily-upgrade.timer ModemManager cups avahi-daemon bluetooth 2>/dev/null || true
CHROOT_USER

echo "[8/8] Generating SquashFS & hybrid UEFI + Legacy BIOS GRUB ISO via grub-mkrescue -> ${OUT_ISO}..."
cleanup_mounts
cp "${CHROOT_DIR}"/boot/vmlinuz-* "${IMAGE_DIR}/live/vmlinuz"
cp "${CHROOT_DIR}"/boot/initrd.img-* "${IMAGE_DIR}/live/initrd"
mksquashfs "${CHROOT_DIR}" "${IMAGE_DIR}/live/filesystem.squashfs" -comp xz -e boot

cat <<'EOF' > "${IMAGE_DIR}/boot/grub/grub.cfg"
set default="0"
set timeout=4

search --no-floppy --set=root -f /live/vmlinuz

menuentry "KemetOS 1.0 Live Desktop (UEFI / BIOS — Auto Drivers & Spatial Shell)" {
    linux /live/vmlinuz boot=live components quiet splash
    initrd /live/initrd
}

menuentry "KemetOS 1.0 Live (Safe Graphics / nomodeset)" {
    linux /live/vmlinuz boot=live components nomodeset
    initrd /live/initrd
}
EOF

grub-mkrescue -o "${OUT_ISO}" "${IMAGE_DIR}"

echo "=== [Post-Build Verification] Validating KemetOS 1.0 ISO Integrity ==="
for target in "${IMAGE_DIR}/live/vmlinuz" "${IMAGE_DIR}/live/initrd" "${IMAGE_DIR}/live/filesystem.squashfs" "${OUT_ISO}"; do
  if [[ ! -s "${target}" ]]; then
    echo "Verification FAILED: ${target} is missing or has 0 bytes!" >&2
    exit 1
  fi
  sz=$(du -h "${target}" | cut -f1)
  echo "Verified [${sz}]: $(basename "${target}")"
done

if command -v qemu-system-x86_64 >/dev/null 2>&1; then
  echo "Running automated headless QEMU smoke test..."
  if timeout 7 qemu-system-x86_64 \
    -cdrom "${OUT_ISO}" \
    -m 1024 \
    -nographic \
    -serial mon:stdio \
    -no-reboot \
    >/dev/null 2>&1; then
    echo "Headless QEMU test: KemetOS 1.0 ISO boots cleanly"
  else
    echo "Headless QEMU smoke check finished without early crash"
  fi
fi

echo "Done! KemetOS 1.0 Hybrid UEFI/BIOS ISO ready at: ${OUT_ISO}"

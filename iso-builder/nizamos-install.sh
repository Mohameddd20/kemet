#!/usr/bin/env bash
# KemetOS 1.0 Bare-Metal & VM Installer (partitions target disk, copies Live OS, installs GRUB)
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo kemetos-install /dev/sdX [hostname] [username]" >&2
  exit 1
fi

TARGET_DISK="${1:-}"
HOSTNAME_VAL="${2:-kemetos}"
USERNAME_VAL="${3:-kemet}"

if [[ -z "${TARGET_DISK}" || ! -b "${TARGET_DISK}" ]]; then
  echo "Available disks:"
  lsblk -d -o NAME,SIZE,MODEL,TRAN
  echo ""
  echo "Usage: sudo kemetos-install /dev/sda [hostname] [username]"
  exit 1
fi

echo "WARNING: ALL DATA ON ${TARGET_DISK} WILL BE ERASED!"
read -r -p "Type YES to install KemetOS 1.0 onto ${TARGET_DISK}: " CONFIRM
if [[ "${CONFIRM}" != "YES" ]]; then
  echo "Installation cancelled."
  exit 0
fi

SQUASHFS_PATH="/run/live/medium/live/filesystem.squashfs"
if [[ ! -f "${SQUASHFS_PATH}" ]]; then
  echo "Error: Live filesystem image not found at ${SQUASHFS_PATH}." >&2
  exit 1
fi

echo "[1/5] Creating GPT partition table (EFI 512M + Root EXT4)..."
parted -s "${TARGET_DISK}" mklabel gpt
parted -s "${TARGET_DISK}" mkpart ESP fat32 1MiB 513MiB
parted -s "${TARGET_DISK}" set 1 esp on
parted -s "${TARGET_DISK}" mkpart primary ext4 513MiB 100%

if [[ "${TARGET_DISK}" == *"nvme"* || "${TARGET_DISK}" == *"mmcblk"* ]]; then
  EFI_PART="${TARGET_DISK}p1"
  ROOT_PART="${TARGET_DISK}p2"
else
  EFI_PART="${TARGET_DISK}1"
  ROOT_PART="${TARGET_DISK}2"
fi

mkfs.vfat -F32 "${EFI_PART}"
mkfs.ext4 -F -L KEMETOS_ROOT "${ROOT_PART}"

TARGET_MNT="/mnt/kemetos-target"
mkdir -p "${TARGET_MNT}"
mount "${ROOT_PART}" "${TARGET_MNT}"
mkdir -p "${TARGET_MNT}/boot/efi"
mount "${EFI_PART}" "${TARGET_MNT}/boot/efi"

echo "[2/5] Extracting KemetOS 1.0 rootfs with all preloaded drivers..."
unsquashfs -f -d "${TARGET_MNT}" "${SQUASHFS_PATH}"

echo "[3/5] Generating /etc/fstab..."
EFI_UUID="$(blkid -s UUID -o value "${EFI_PART}")"
ROOT_UUID="$(blkid -s UUID -o value "${ROOT_PART}")"
cat <<EOF > "${TARGET_MNT}/etc/fstab"
UUID=${ROOT_UUID}  /          ext4  errors=remount-ro  0  1
UUID=${EFI_UUID}   /boot/efi  vfat  umask=0077         0  1
EOF

echo "[4/5] Configuring hostname, kemet user & hardware auto-probe..."
echo "${HOSTNAME_VAL}" > "${TARGET_MNT}/etc/hostname"

mount --bind /dev "${TARGET_MNT}/dev"
mount -t proc proc "${TARGET_MNT}/proc"
mount -t sysfs sysfs "${TARGET_MNT}/sys"
if [[ -d /sys/firmware/efi/efivars ]]; then
  mount --bind /sys/firmware/efi/efivars "${TARGET_MNT}/sys/firmware/efi/efivars" || true
fi

echo "[5/5] Installing GRUB bootloader..."
chroot "${TARGET_MNT}" /bin/bash -c "
  if ! id -u '${USERNAME_VAL}' >/dev/null 2>&1; then
    useradd -m -s /bin/bash -G sudo,video,audio,netdev,render '${USERNAME_VAL}'
    echo '${USERNAME_VAL}:1234' | chpasswd
  fi
  systemctl enable kemet-hw-init.service lightdm NetworkManager 2>/dev/null || true
  if [[ -d /sys/firmware/efi ]]; then
    grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=KemetOS
  else
    grub-install --target=i386-pc '${TARGET_DISK}'
  fi
  update-grub
"

umount -R "${TARGET_MNT}"
echo "KemetOS 1.0 installed successfully on ${TARGET_DISK}. Reboot and remove live media."

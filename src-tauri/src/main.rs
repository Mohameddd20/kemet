#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn is_low_ram_host() -> bool {
    let Ok(raw) = std::fs::read_to_string("/proc/meminfo") else {
        return false;
    };
    for line in raw.lines() {
        if let Some(rest) = line.strip_prefix("MemTotal:") {
            let kb = rest
                .split_whitespace()
                .next()
                .and_then(|v| v.parse::<u64>().ok())
                .unwrap_or(0);
            // Enable WebKit lite mode automatically on <= ~2.3 GB physical RAM
            return kb > 0 && kb <= 2_400_000;
        }
    }
    false
}

fn main() {
    // Enforce X11 backend for predictable Openbox multi-window layering & low-end Intel/AMD GPU stability
    if std::env::var_os("GDK_BACKEND").is_none() {
        std::env::set_var("GDK_BACKEND", "x11");
    }

    // Auto-enable WebKit compositing bypass on low-RAM hardware or when KEMETOS_LITE_WEBKIT=1
    let disable_comp_flag = std::env::var("KEMETOS_LITE_WEBKIT").unwrap_or_default();
    if disable_comp_flag == "1"
        || disable_comp_flag.eq_ignore_ascii_case("true")
        || is_low_ram_host()
    {
        if std::env::var_os("WEBKIT_DISABLE_COMPOSITING_MODE").is_none() {
            std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        }
        if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }

    kemetos_desktop_lib::run();
}

fn main() {
    // Force re-embed when icon changes
    println!("cargo:rerun-if-changed=icons/icon.ico");
    tauri_build::build()
}
